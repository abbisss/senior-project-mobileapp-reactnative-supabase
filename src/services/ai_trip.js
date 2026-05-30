import Constants from "expo-constants";
const API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY;

function extractJSON(text) {
  let cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  if (cleaned.startsWith("[") || cleaned.startsWith("{")) {
    return JSON.parse(cleaned);
  }

  const firstBracket = cleaned.search(/[\[\{]/);
  if (firstBracket === -1) throw new Error("No JSON object or array found");

  let open = 0;
  let start = firstBracket;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === "[" || char === "{") open++;
    if (char === "]" || char === "}") {
      open--;
      if (open === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error("Unbalanced brackets");

  return JSON.parse(cleaned.substring(start, end));
}

async function generateAITrip(tripInput, retries = 3) {

  if (!tripInput?.places?.length && !tripInput?.services?.length) {
    console.warn("generateAITrip: no places or services provided");
    return null;
  }

  const budgetMinutes = (tripInput.duration ?? 2) * 60;

  const prompt = `  You are a travel itinerary planner for Lebanon. Output ONLY a valid JSON array — no prose, no markdown, no explanation.

                    INPUTS:
                    Trip style: ${tripInput.tripStyle}
                    Total time budget: ${budgetMinutes} minutes
                    Places (use place_id as "id"): ${JSON.stringify(tripInput.places)}
                    Services (use service_id as "id"): ${JSON.stringify(tripInput.services)}

                    HARD RULES:
                    1. Use ONLY the exact place_id / service_id values from the input. Never invent IDs.
                    2. Sum of all estimatedTime values must be <= ${budgetMinutes} minutes.
                    3. Travel time between stops is NOT included in estimatedTime but IS deducted from the budget: distance_km * 2 min driving, distance_km * 12 min if < 1 km (walking).
                    4. Each stop must have exactly these fields: type ("place" or "service"), id (number), order (starts at 1), estimatedTime (minutes at location only).

                    REALISM RULES — apply before anything else:
                    - Using lat/lng, cluster all stops geographically (~30 km radius). Pick the ONE best cluster that fits the trip style. Never mix stops from distant Lebanese regions (e.g. Akkar + South Lebanon) in one trip.
                    - If any two consecutive stops require > 45 min driving, drop the farther stop.
                    - If total travel time across all legs exceeds 50% of the budget, keep dropping the farthest stops until it fits.
                    - Fewer realistic stops > many unrealistic ones.

                    STOP DURATION RANGES (stay within these):
                    mountain / forest / valley / hill: 60–180 min
                    waterfall / cave / lake / river / beach: 45–150 min
                    park / historical / religious: 45–90 min
                    restaurant: 45–75 min | cafe: 20–45 min
                    campsite / guesthouse / resort: 60–120 min | rest_area: 15–30 min

                    ORDERING: nearest-neighbor geographic order. Interleave services naturally between places.

                    Return ONLY the JSON array:
                    [{"type":"place","id":1,"order":1,"estimatedTime":90},{"type":"service","id":3,"order":2,"estimatedTime":45}]`;

  for (let i = 0; i < retries; i++) {
    try {
      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=" +
        API_KEY;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (res.status === 429) {
        const wait = Math.pow(2, i) * 1000;
        console.warn(`Rate limited – retrying in ${wait}ms`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      if (!res.ok) {
        const err = await res.json();
        console.error("Gemini API error:", JSON.stringify(err));
        if (i === retries - 1) return null;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!rawText) {
        console.warn(
          "Empty response from Gemini. Full response:",
          JSON.stringify(data),
        );
        if (i === retries - 1) return null;
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }

      const itinerary = extractJSON(rawText);

      // Validate: every item must have required fields and a real ID
      const placeIds = new Set((tripInput.places ?? []).map((p) => p.place_id));
      const serviceIds = new Set(
        (tripInput.services ?? []).map((s) => s.service_id),
      );

      const valid = itinerary.every((item) => {
        if (!["place", "service"].includes(item.type)) return false;
        if (
          typeof item.id !== "number" ||
          typeof item.estimatedTime !== "number"
        )
          return false;
        if (item.type === "place" && !placeIds.has(item.id)) return false;
        if (item.type === "service" && !serviceIds.has(item.id)) return false;
        return true;
      });

      if (!valid) {
        console.warn(
          `Attempt ${i + 1}: Gemini returned invalid/hallucinated IDs, retrying...`,
        );
        if (i === retries - 1) return null;
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }

      console.log(
        "Trip generated:",
        itinerary.map((item) => `${item.type}:${item.id}`).join(" → "),
      );
      return itinerary;
    } catch (err) {
      console.error(`Attempt ${i + 1} failed:`, err.message ?? err);
      if (i === retries - 1) {
        console.error("All retries exhausted.");
        return null;
      }
      await new Promise((r) =>
        setTimeout(
          r,
          err.status === 429 ? Math.pow(2, i) * 1000 : 1000 * (i + 1),
        ),
      );
    }
  }
  return null;
}

export { generateAITrip };
