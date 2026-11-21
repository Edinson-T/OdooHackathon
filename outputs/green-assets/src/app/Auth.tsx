import { useEffect, useState, type ReactNode } from "react";
import { createClient, type User as GoogleUser } from "@supabase/supabase-js";
import type { User } from "../domain/types";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const client = url && key ? createClient(url,key,{auth:{flowType:"pkce"}}) : null;

export function Auth({children}:{children:(user:User, logout:()=>void, change:()=>void)=>ReactNode}) {
  const [user,setUser] = useState<GoogleUser|null>(null);
  const [demo, setDemo] = useState<User | null>(null);
  const [error,setError] = useState("");
  const [ready,setReady] = useState(false);
  useEffect(() => {
    if (!client) {setReady(true); return;}
    const {data} = client.auth.onAuthStateChange((_event,session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  },[]);
  async function login() {
    if (!client) return;
    const {error} = await client.auth.signInWithOAuth({provider:"google",options:{
      redirectTo:location.origin+location.pathname,queryParams:{prompt:"select_account"}}});
    if (error) setError(error.message);
  }
  async function leave(change:boolean) {
    const {error} = await client!.auth.signOut({scope:"local"});
    if (error) {setError(error.message);return;}
    location.hash="/";
    if (change) await login();
  }
  if (!ready) return <main>Checking session…</main>;
  if (!client) {
    const exitDemo = () => { setDemo(null); location.hash = "/"; };
    if (demo) return children(demo, exitDemo, exitDemo);
    return <main className="panel form">
      <h1>Green Assets demo</h1>
      <p>Choose a local demo role. Records stay in this browser.</p>
      <button className="primary" onClick={() => setDemo({id:"user-a",name:"Maya Chen",role:"community"})}>Enter as demo member</button>
      <button onClick={() => setDemo({id:"admin-1",name:"Alex Moss",role:"admin"})}>Enter as demo administrator</button>
    </main>;
  }
  if (user) return <>{error && <p role="alert">{error}</p>}{children({id:user.id,name:user.user_metadata.full_name || user.email || "Member",role:user.app_metadata.role === "admin" ? "admin":"community"},()=>void leave(false),()=>void leave(true))}</>;
  return <main className="panel form"><h1>Green Assets</h1><button className="primary" disabled={!client} onClick={login}>Continue with Google</button>
    {error && <p role="alert">{error}</p>}</main>;
}
