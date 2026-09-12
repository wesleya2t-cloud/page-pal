import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Book = Tables<"books">;
export type ReadingSession = Tables<"reading_sessions">;
export type StudySession = Tables<"study_sessions">;
export type Friendship = Tables<"friendships">;
export type Recommendation = Tables<"recommendations">;
export type Kudos = Tables<"kudos">;

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
    staleTime: 1000 * 60,
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useBooks(userId: string | undefined) {
  return useQuery({
    queryKey: ["books", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useReadingSessions(userId: string | undefined) {
  return useQuery({
    queryKey: ["reading-sessions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reading_sessions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });
}

export function useStudySessions(userId: string | undefined) {
  return useQuery({
    queryKey: ["study-sessions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });
}

/** Accepted + pending friendships involving the signed-in user, with the other person's profile. */
export function useFriendships(userId: string | undefined) {
  return useQuery({
    queryKey: ["friendships", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("friendships").select("*");
      if (error) throw error;
      const otherIds = data.map((f) => (f.requester_id === userId ? f.addressee_id : f.requester_id));
      const profiles = otherIds.length
        ? ((await supabase.from("profiles").select("*").in("id", otherIds)).data ?? [])
        : [];
      const byId = new Map(profiles.map((p) => [p.id, p]));
      return data.map((f) => ({
        ...f,
        other: byId.get(f.requester_id === userId ? f.addressee_id : f.requester_id) ?? null,
        incoming: f.addressee_id === userId,
      }));
    },
  });
}

export type FriendEdge = NonNullable<ReturnType<typeof useFriendships>["data"]>[number];

export function useProfilesByIds(ids: string[]) {
  const key = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["profiles", key],
    enabled: key.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").in("id", key);
      if (error) throw error;
      return new Map(data.map((p) => [p.id, p]));
    },
  });
}
