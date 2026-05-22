import { createContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // get user from your DB table
  const fetchDbUser = async (authUser) => {
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .eq("auth_id", authUser.id)
      .single();

    if (!error) {
      setDbUser(data);
    } else {
      setDbUser(null);
    }
  };

  useEffect(() => {
    // get initial session
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data?.session?.user || null;

      setUser(sessionUser);

      if (sessionUser) {
        fetchDbUser(sessionUser);
      }

      setLoading(false);
    });

    // listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionUser = session?.user || null;

        setUser(sessionUser);

        if (sessionUser) {
          fetchDbUser(sessionUser);
        } else {
          setDbUser(null);
        }
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={{ user, dbUser, setDbUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}
