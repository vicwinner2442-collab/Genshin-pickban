"use client";

import Image from "next/image";
import Link from "next/link";
import { RealtimeChannel } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCharacterImageUrl } from "../../../lib/character-image";
import { supabase } from "../../../lib/supabase";

type DraftMode = "single_roster" | "dual_roster";
type TurnRole = "host" | "guest";
type DraftPhase = "immunity" | "ban" | "pick" | "done";
const IMMUNE_PICK_SLOT_INDEXES = [3, 7] as const;
const DUAL_ROSTER_PICK_STEP_COUNTS = [1, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 1] as const;
const SINGLE_ROSTER_PICK_TURNS: TurnRole[] = ["guest", "host", "host", "guest", "guest", "host", "guest", "host"];

const DUAL_ROSTER_PICK_TURNS: Array<{ role: TurnRole; count: number }> = [
  { role: "host", count: 1 },
  { role: "guest", count: 2 },
  { role: "host", count: 2 },
  { role: "guest", count: 1 },
  { role: "host", count: 1 },
  { role: "guest", count: 1 },
  { role: "host", count: 2 },
  { role: "guest", count: 2 },
  { role: "host", count: 1 },
  { role: "guest", count: 1 },
  { role: "host", count: 1 },
  { role: "guest", count: 1 },
];

type Room = {
  code: string;
  host_user_id: string;
  status: string | null;
  ban_count: number | null;
  pick_count: number | null;
  immunity_count: number | null;
  turn_timer_seconds: number | null;
  draft_mode: DraftMode | null;
  draft_state: unknown;
  created_at?: string;
};

type RoomPlayer = {
  user_id: string;
  display_name: string | null;
  role: string | null;
  created_at: string | null;
};

type Profile = {
  id: string;
  nickname: string;
};

type UserCharacter = {
  user_id: string;
  character_slug: string;
  constellation: number | null;
};

type CharacterName = {
  slug: string;
  name: string;
  image_path: string | null;
};

type PlayerCharacter = {
  slug: string;
  name: string;
  constellation: number;
  imagePath: string | null;
};

type DraftSelection = {
  actor_user_id: string;
  source_user_id: string;
  character_slug: string;
  character_name: string;
  constellation: number;
  image_path: string | null;
};

type DraftState = {
  target_user_id: string | null;
  turn_started_at: string | null;
  ready_user_ids: string[];
  first_turn_user_id: string | null;
  immunities: DraftSelection[];
  bans: DraftSelection[];
  picks: DraftSelection[];
};

type IndexedDraftSelection = {
  selection: DraftSelection;
  index: number;
};

const EMPTY_DRAFT: DraftState = {
  target_user_id: null,
  turn_started_at: null,
  ready_user_ids: [],
  first_turn_user_id: null,
  immunities: [],
  bans: [],
  picks: [],
};

function formatRoomError(error: { message: string; code?: string } | null) {
  if (!error) return "";

  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /Could not find the table 'public\.(rooms|room_players)' in the schema cache/i.test(error.message)
  ) {
    return 'У БД немає таблиць кімнат. Створи "rooms" та "room_players" у Supabase.';
  }

  if (error.code === "42703" && /(ban_count|pick_count|turn_timer_seconds|draft_mode|draft_state|immunity_count)/i.test(error.message)) {
    return 'У таблиці "rooms" бракує нових колонок налаштувань. Запусти оновлений SQL зі схеми (rooms-schema.sql).';
  }

  return error.message;
}

function getDisplayName(player: RoomPlayer | null) {
  if (!player) return "";
  return player.display_name?.trim() || player.user_id.slice(0, 8);
}

function normalizeDraftState(raw: unknown, immunityLimit: number, banLimit: number, pickLimit: number): DraftState {
  if (!raw || typeof raw !== "object") {
    return EMPTY_DRAFT;
  }

  const objectValue = raw as {
    target_user_id?: unknown;
    turn_started_at?: unknown;
    ready_user_ids?: unknown;
    first_turn_user_id?: unknown;
    immunities?: unknown;
    bans?: unknown;
    picks?: unknown;
  };
  const rawImmunities = Array.isArray(objectValue.immunities) ? objectValue.immunities : [];
  const rawBans = Array.isArray(objectValue.bans) ? objectValue.bans : [];
  const rawPicks = Array.isArray(objectValue.picks) ? objectValue.picks : [];
  const rawReadyUserIds = Array.isArray(objectValue.ready_user_ids) ? objectValue.ready_user_ids : [];
  const targetUserId = typeof objectValue.target_user_id === "string" ? objectValue.target_user_id : null;
  const turnStartedAt = typeof objectValue.turn_started_at === "string" ? objectValue.turn_started_at : null;
  const firstTurnUserId = typeof objectValue.first_turn_user_id === "string" ? objectValue.first_turn_user_id : null;
  const readyUserIds = Array.from(
    new Set(rawReadyUserIds.filter((item): item is string => typeof item === "string" && item.length > 0))
  );

  const immunities = rawImmunities
    .filter((item): item is DraftSelection => typeof item === "object" && item !== null)
    .slice(0, immunityLimit);
  const bans = rawBans
    .filter((item): item is DraftSelection => typeof item === "object" && item !== null)
    .slice(0, banLimit);
  const picks = rawPicks
    .filter((item): item is DraftSelection => typeof item === "object" && item !== null)
    .slice(0, pickLimit);

  return {
    target_user_id: targetUserId,
    turn_started_at: turnStartedAt,
    ready_user_ids: readyUserIds,
    first_turn_user_id: firstTurnUserId,
    immunities,
    bans,
    picks,
  };
}

function getDualRosterPickTurns(starterRole: TurnRole): Array<{ role: TurnRole; count: number }> {
  const otherRole: TurnRole = starterRole === "host" ? "guest" : "host";
  return DUAL_ROSTER_PICK_STEP_COUNTS.map((count, index) => ({
    role: index % 2 === 0 ? starterRole : otherRole,
    count,
  }));
}

function getSingleRosterPickRole(picksCount: number): TurnRole {
  if (picksCount < SINGLE_ROSTER_PICK_TURNS.length) {
    return SINGLE_ROSTER_PICK_TURNS[picksCount];
  }

  return picksCount % 2 === 0 ? "host" : "guest";
}

function getDualRosterPickTurnState(picksCount: number, turns: Array<{ role: TurnRole; count: number }>) {
  let consumedPicks = 0;

  for (let index = 0; index < turns.length; index += 1) {
    const step = turns[index];
    const stepStart = consumedPicks;
    const stepEnd = consumedPicks + step.count;
    if (picksCount < stepEnd) {
      return {
        turnIndex: index,
        role: step.role,
        count: step.count,
        stepStart,
      };
    }
    consumedPicks = stepEnd;
  }

  return null;
}

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const roomCode = useMemo(() => String(params?.code ?? "").toUpperCase(), [params?.code]);

  const [userId, setUserId] = useState<string>("");
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [playerCharacters, setPlayerCharacters] = useState<Record<string, PlayerCharacter[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<DraftState>(EMPTY_DRAFT);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  const autoTurnLockRef = useRef<string>("");

  const isHost = room?.host_user_id === userId;

  const draftMode: DraftMode = room?.draft_mode === "dual_roster" ? "dual_roster" : "single_roster";
  const immunityCount = draftMode === "dual_roster" ? 2 : 0;
  const banPerPlayer = Math.max(1, room?.ban_count ?? 2);
  const banLimit = draftMode === "dual_roster" ? banPerPlayer * 2 : banPerPlayer;
  const pickLimit = draftMode === "dual_roster" ? 16 : 8;

  const sortedPlayers = useMemo(() => {
    if (!room) return players;

    return [...players].sort((a, b) => {
      if (a.user_id === room.host_user_id) return -1;
      if (b.user_id === room.host_user_id) return 1;
      return 0;
    });
  }, [players, room]);

  const hostPlayer = useMemo(
    () => sortedPlayers.find((player) => player.user_id === room?.host_user_id) ?? null,
    [sortedPlayers, room?.host_user_id]
  );

  const guestPlayer = useMemo(
    () => sortedPlayers.find((player) => room && player.user_id !== room.host_user_id) ?? null,
    [sortedPlayers, room]
  );

  const hasGuest = Boolean(guestPlayer);
  const timerEnabled = (room?.turn_timer_seconds ?? 0) > 0;
  const participantUserIds = useMemo(
    () => [hostPlayer?.user_id, guestPlayer?.user_id].filter((id): id is string => Boolean(id)),
    [hostPlayer?.user_id, guestPlayer?.user_id]
  );
  const firstTurnUserId = useMemo(() => {
    if (!hasGuest) return hostPlayer?.user_id ?? null;
    if (draft.first_turn_user_id && participantUserIds.includes(draft.first_turn_user_id)) {
      return draft.first_turn_user_id;
    }
    return guestPlayer?.user_id ?? hostPlayer?.user_id ?? null;
  }, [hasGuest, hostPlayer?.user_id, guestPlayer?.user_id, participantUserIds, draft.first_turn_user_id]);
  const firstTurnRole: TurnRole = firstTurnUserId === hostPlayer?.user_id ? "host" : "guest";
  const oppositeTurnRole: TurnRole = firstTurnRole === "host" ? "guest" : "host";
  const dualRosterPickTurns = useMemo(() => getDualRosterPickTurns(firstTurnRole), [firstTurnRole]);
  const readyUserIds = useMemo(() => {
    const allowed = new Set(participantUserIds);
    return draft.ready_user_ids.filter((id) => allowed.has(id));
  }, [draft.ready_user_ids, participantUserIds]);
  const bothPlayersReady = useMemo(() => {
    if (!timerEnabled) return true;
    if (!hasGuest || participantUserIds.length < 2) return false;
    return participantUserIds.every((id) => readyUserIds.includes(id));
  }, [timerEnabled, hasGuest, participantUserIds, readyUserIds]);
  const waitingForReady = timerEnabled && !bothPlayersReady;
  const isCurrentUserReady = Boolean(userId) && readyUserIds.includes(userId);

  const myRole: TurnRole | "observer" = !room
    ? "observer"
    : userId === room.host_user_id
    ? "host"
    : hasGuest && userId === guestPlayer?.user_id
    ? "guest"
    : "observer";

  const phase: DraftPhase =
    draftMode === "dual_roster" && draft.immunities.length < immunityCount
      ? "immunity"
      : draft.bans.length < banLimit
      ? "ban"
      : draft.picks.length < pickLimit
      ? "pick"
      : "done";

  const dualPickTurnState = useMemo(() => {
    if (draftMode !== "dual_roster" || phase !== "pick") return null;
    return getDualRosterPickTurnState(draft.picks.length, dualRosterPickTurns);
  }, [draftMode, phase, draft.picks.length, dualRosterPickTurns]);

  const turnRole: TurnRole | null = useMemo(() => {
    if (phase === "done") return null;

    if (!hasGuest) {
      return "host";
    }

    if (phase === "immunity") {
      return draft.immunities.length % 2 === 0 ? firstTurnRole : oppositeTurnRole;
    }

    if (phase === "ban") {
      return draft.bans.length % 2 === 0 ? firstTurnRole : oppositeTurnRole;
    }

    if (draftMode === "dual_roster") {
      return dualPickTurnState?.role ?? null;
    }

    return getSingleRosterPickRole(draft.picks.length);
  }, [
    phase,
    hasGuest,
    draft.immunities.length,
    draft.bans.length,
    draft.picks.length,
    draftMode,
    dualPickTurnState,
    firstTurnRole,
    oppositeTurnRole,
  ]);

  const immunitySlugs = useMemo(() => new Set(draft.immunities.map((item) => item.character_slug)), [draft.immunities]);
  const usedCharacterSlugs = useMemo(() => {
    return new Set([
      ...draft.immunities.map((item) => item.character_slug),
      ...draft.bans.map((item) => item.character_slug),
      ...draft.picks.filter((item) => !immunitySlugs.has(item.character_slug)).map((item) => item.character_slug),
    ]);
  }, [draft.immunities, draft.bans, draft.picks, immunitySlugs]);
  const indexedImmunities = useMemo<IndexedDraftSelection[]>(
    () => draft.immunities.map((selection, index) => ({ selection, index })),
    [draft.immunities]
  );
  const indexedBans = useMemo<IndexedDraftSelection[]>(
    () => draft.bans.map((selection, index) => ({ selection, index })),
    [draft.bans]
  );
  const indexedPicks = useMemo<IndexedDraftSelection[]>(
    () => draft.picks.map((selection, index) => ({ selection, index })),
    [draft.picks]
  );
  const hostBanSelections = useMemo(
    () =>
      hostPlayer?.user_id
        ? indexedBans.filter((item) => item.selection.source_user_id === hostPlayer.user_id)
        : [],
    [indexedBans, hostPlayer?.user_id]
  );
  const guestBanSelections = useMemo(
    () =>
      guestPlayer?.user_id
        ? indexedBans.filter((item) => item.selection.source_user_id === guestPlayer.user_id)
        : [],
    [indexedBans, guestPlayer?.user_id]
  );
  const hostPickSelections = useMemo(
    () =>
      hostPlayer?.user_id
        ? indexedPicks.filter((item) => item.selection.source_user_id === hostPlayer.user_id)
        : [],
    [indexedPicks, hostPlayer?.user_id]
  );
  const guestPickSelections = useMemo(
    () =>
      guestPlayer?.user_id
        ? indexedPicks.filter((item) => item.selection.source_user_id === guestPlayer.user_id)
        : [],
    [indexedPicks, guestPlayer?.user_id]
  );

  const dualPickOrderNumbers = useMemo(() => {
    let globalNumber = 1;
    const host: number[] = [];
    const guest: number[] = [];

    dualRosterPickTurns.forEach((step) => {
      for (let count = 0; count < step.count; count += 1) {
        if (step.role === "host") {
          host.push(globalNumber);
        } else {
          guest.push(globalNumber);
        }
        globalNumber += 1;
      }
    });

    return { host, guest };
  }, [dualRosterPickTurns]);

  const nextLocalPickIndex = useMemo(() => {
    if (phase !== "pick" || draftMode !== "dual_roster" || !turnRole) return null;

    if (turnRole === "host") {
      return hostPickSelections.length;
    }

    return guestPickSelections.length;
  }, [phase, draftMode, turnRole, hostPickSelections.length, guestPickSelections.length]);

  const isCurrentPickImmuneSlot = useMemo(() => {
    if (phase !== "pick" || draftMode !== "dual_roster" || nextLocalPickIndex === null) return false;
    return IMMUNE_PICK_SLOT_INDEXES.includes(nextLocalPickIndex as (typeof IMMUNE_PICK_SLOT_INDEXES)[number]);
  }, [phase, draftMode, nextLocalPickIndex]);

  const selectedSingleRosterUserId = useMemo(() => {
    if (draftMode !== "single_roster") return null;
    if (draft.target_user_id) return draft.target_user_id;
    return hostPlayer?.user_id ?? null;
  }, [draftMode, draft.target_user_id, hostPlayer?.user_id]);

  const activeSourceUserId = useMemo(() => {
    if (draftMode === "single_roster") {
      return selectedSingleRosterUserId;
    }

    const actor = turnRole === "host" ? hostPlayer : guestPlayer;
    if (!actor) return hostPlayer?.user_id ?? null;
    if (!hasGuest) return actor.user_id;

    if (phase === "ban") {
      return actor.user_id === hostPlayer?.user_id ? guestPlayer?.user_id ?? null : hostPlayer?.user_id ?? null;
    }

    if (phase === "immunity") {
      return actor.user_id;
    }

    return actor.user_id;
  }, [draftMode, selectedSingleRosterUserId, turnRole, hostPlayer, guestPlayer, hasGuest, phase]);

  const activeSourcePlayer = useMemo(
    () => sortedPlayers.find((player) => player.user_id === activeSourceUserId) ?? null,
    [sortedPlayers, activeSourceUserId]
  );

  const isTargetSelectionLocked = draft.bans.length > 0 || draft.picks.length > 0;
  const isDualDraftStarted = draft.immunities.length > 0 || draft.bans.length > 0 || draft.picks.length > 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const persistDraft = async (nextDraft: DraftState, options?: { resetTurnTimer?: boolean }) => {
    if (!roomCode) return;

    setSavingDraft(true);
    setMessage("");

    const shouldResetTurnTimer = options?.resetTurnTimer ?? true;
    const payload: DraftState = {
      ...nextDraft,
      turn_started_at: shouldResetTurnTimer ? new Date().toISOString() : nextDraft.turn_started_at,
    };

    const { error } = await supabase
      .from("rooms")
      .update({ draft_state: payload })
      .eq("code", roomCode);

    setSavingDraft(false);

    if (error) {
      setMessage(formatRoomError(error));
      return;
    }

    setDraft(payload);
  };

  const setDraftTargetUser = async (targetUserId: string) => {
    if (draftMode !== "single_roster") return;
    if (isTargetSelectionLocked) {
      setMessage("Після першого бану/піку не можна змінити, кому драфтимо.");
      return;
    }
    if (targetUserId !== hostPlayer?.user_id && targetUserId !== guestPlayer?.user_id) {
      setMessage("Не вдалося вибрати ростер для драфту.");
      return;
    }

    await persistDraft({ ...draft, target_user_id: targetUserId }, { resetTurnTimer: false });
  };

  const setCurrentUserReady = async () => {
    if (!userId || myRole === "observer" || !timerEnabled || !hasGuest) return;
    if (readyUserIds.includes(userId)) return;

    const nextReadyUserIds = Array.from(new Set([...readyUserIds, userId]));
    const shouldStartTimer = participantUserIds.length > 0 && participantUserIds.every((id) => nextReadyUserIds.includes(id));

    await persistDraft(
      {
        ...draft,
        ready_user_ids: nextReadyUserIds,
        turn_started_at: shouldStartTimer ? new Date().toISOString() : draft.turn_started_at,
      },
      { resetTurnTimer: false }
    );
  };

  const setFirstTurnUser = async (nextValue: string) => {
    if (!isHost || draftMode !== "dual_roster") return;
    if (!hostPlayer || !guestPlayer) {
      setMessage("Спочатку дочекайся обох гравців.");
      return;
    }
    if (isDualDraftStarted) {
      setMessage("Після старту драфту не можна змінити, хто ходить першим.");
      return;
    }

    let nextFirstTurnUserId: string = nextValue;
    if (nextValue === "random") {
      nextFirstTurnUserId = Math.random() < 0.5 ? hostPlayer.user_id : guestPlayer.user_id;
    }

    if (nextFirstTurnUserId !== hostPlayer.user_id && nextFirstTurnUserId !== guestPlayer.user_id) {
      setMessage("Не вдалося встановити першого гравця.");
      return;
    }

    await persistDraft({ ...draft, first_turn_user_id: nextFirstTurnUserId }, { resetTurnTimer: false });
    if (nextValue === "random") {
      const pickedName = nextFirstTurnUserId === hostPlayer.user_id ? getDisplayName(hostPlayer) : getDisplayName(guestPlayer);
      setMessage(`Випадково обрано: ${pickedName || "гравець"}.`);
    }
  };

  const trySelectCharacter = async (sourcePlayer: RoomPlayer, character: PlayerCharacter) => {
    if (!room) return;

    if (phase === "done") {
      setMessage("Драфт уже завершено.");
      return;
    }

    if (waitingForReady) {
      setMessage("Обидва гравці мають натиснути «ГОТОВИЙ» перед стартом таймера.");
      return;
    }

    if (myRole === "observer") {
      setMessage("Тільки учасники кімнати можуть робити ходи.");
      return;
    }

    if (turnRole && myRole !== turnRole) {
      setMessage("Зараз не ваш хід.");
      return;
    }

    if (!activeSourceUserId) {
      setMessage("Немає доступного ростеру для цього ходу.");
      return;
    }

    const isImmuneCharacter = immunitySlugs.has(character.slug);

    if (sourcePlayer.user_id !== activeSourceUserId) {
      if (draftMode === "single_roster") {
        setMessage("Зараз можна обирати тільки з вибраного ростеру.");
      } else if (phase === "immunity") {
        setMessage("Імунітет обирається лише зі свого ростеру.");
      } else if (phase === "ban") {
        setMessage("У режимі «Два ростери» банимо тільки персонажів суперника.");
      } else {
        setMessage("У режимі «Два ростери» пікаємо тільки зі свого ростеру.");
      }
      return;
    }

    if (phase === "immunity" && draft.immunities.some((item) => item.character_slug === character.slug)) {
      setMessage("Цей персонаж уже в імунітеті.");
      return;
    }

    if (phase === "ban" && isImmuneCharacter) {
      setMessage("Персонажа в імунітеті не можна банити.");
      return;
    }

    if (phase === "pick" && draftMode === "dual_roster") {
      if (isCurrentPickImmuneSlot && !isImmuneCharacter) {
        setMessage("У цей слот можна пікнути лише персонажа з імунітету.");
        return;
      }

      if (!isCurrentPickImmuneSlot && isImmuneCharacter) {
        setMessage("Персонажів з імунітету можна ставити лише в останню колонку (спец-слоти).");
        return;
      }

      if (
        isImmuneCharacter &&
        draft.picks.some((item) => item.source_user_id === sourcePlayer.user_id && item.character_slug === character.slug)
      ) {
        setMessage("Цього персонажа з імунітету ти вже запікнув.");
        return;
      }
    }

    const isBlockedByGlobalUse = usedCharacterSlugs.has(character.slug) && !(phase === "pick" && isImmuneCharacter);
    if (isBlockedByGlobalUse) {
      setMessage("Цей персонаж уже забанений або запікнутий.");
      return;
    }

    const selection: DraftSelection = {
      actor_user_id: userId,
      source_user_id: sourcePlayer.user_id,
      character_slug: character.slug,
      character_name: character.name,
      constellation: character.constellation,
      image_path: character.imagePath,
    };

    const nextDraft: DraftState =
      phase === "immunity"
        ? { ...draft, immunities: [...draft.immunities, selection].slice(0, immunityCount) }
        : phase === "ban"
        ? { ...draft, bans: [...draft.bans, selection].slice(0, banLimit) }
        : { ...draft, picks: [...draft.picks, selection].slice(0, pickLimit) };

    await persistDraft(nextDraft);
  };

  const removeSelectionAt = async (type: "immunity" | "ban" | "pick", index: number) => {
    if (!isHost) {
      setMessage("Скасувати вибір може лише хост.");
      return;
    }

    const nextDraft: DraftState =
      type === "immunity"
        ? { ...draft, immunities: draft.immunities.filter((_, itemIndex) => itemIndex !== index) }
        : type === "ban"
        ? { ...draft, bans: draft.bans.filter((_, itemIndex) => itemIndex !== index) }
        : { ...draft, picks: draft.picks.filter((_, itemIndex) => itemIndex !== index) };

    await persistDraft(nextDraft);
  };

  const resetDraftSelections = async () => {
    if (!isHost) {
      setMessage("Скинути драфт може лише гравець 1.");
      return;
    }

    await persistDraft(
      {
        ...draft,
        first_turn_user_id: draft.first_turn_user_id ?? firstTurnUserId,
        ready_user_ids: [],
        immunities: [],
        bans: [],
        picks: [],
      },
      { resetTurnTimer: true }
    );
    setMessage("Імуни/бани/піки скинуто.");
  };

  const loadRoom = async () => {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Увійди в акаунт, щоб переглядати кімнату.");
      setRoom(null);
      setPlayers([]);
      setPlayerCharacters({});
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .select("code, host_user_id, status, ban_count, pick_count, immunity_count, turn_timer_seconds, draft_mode, draft_state, created_at")
      .eq("code", roomCode)
      .maybeSingle();

    if (roomError) {
      setMessage(formatRoomError(roomError));
      setRoom(null);
      setPlayers([]);
      setPlayerCharacters({});
      setLoading(false);
      return;
    }

    if (!roomData) {
      setMessage("Кімнату не знайдено.");
      setRoom(null);
      setPlayers([]);
      setPlayerCharacters({});
      setLoading(false);
      return;
    }

    const loadedDraftMode: DraftMode = roomData.draft_mode === "dual_roster" ? "dual_roster" : "single_roster";
    const loadedPickLimit = loadedDraftMode === "dual_roster" ? 16 : 8;
    const loadedImmunityCount = loadedDraftMode === "dual_roster" ? 2 : 0;
    setRoom(roomData);
    const loadedBanPerPlayer = Math.max(1, roomData.ban_count ?? 2);
    const loadedBanLimit = loadedDraftMode === "dual_roster" ? loadedBanPerPlayer * 2 : loadedBanPerPlayer;
    setDraft(normalizeDraftState(roomData.draft_state, loadedImmunityCount, loadedBanLimit, loadedPickLimit));

    const { data: roomPlayers, error: playersError } = await supabase
      .from("room_players")
      .select("user_id, display_name, role, created_at")
      .eq("room_code", roomCode)
      .order("created_at", { ascending: true });

    if (playersError) {
      setMessage(formatRoomError(playersError));
      setPlayers([]);
      setPlayerCharacters({});
      setLoading(false);
      return;
    }

    const playersList = roomPlayers ?? [];
    const ids = playersList.map((player) => player.user_id);
    let profileById = new Map<string, string>();

    if (ids.length > 0) {
      const { data: profileRows } = await supabase.from("profiles").select("id, nickname").in("id", ids);
      profileById = new Map((profileRows ?? []).map((row: Profile) => [row.id, row.nickname]));
    }

    setPlayers(
      playersList.map((player) => ({
        ...player,
        display_name: profileById.get(player.user_id) ?? player.display_name,
      }))
    );

    if (ids.length > 0) {
      const { data: userChars } = await supabase
        .from("user_characters")
        .select("user_id, character_slug, constellation")
        .in("user_id", ids);

      const allSlugs = Array.from(new Set((userChars ?? []).map((item: UserCharacter) => item.character_slug)));
      let characterBySlug = new Map<string, CharacterName>();

      if (allSlugs.length > 0) {
        const { data: chars } = await supabase.from("characters").select("slug, name, image_path").in("slug", allSlugs);
        characterBySlug = new Map((chars ?? []).map((item: CharacterName) => [item.slug, item]));
      }

      const byUser: Record<string, PlayerCharacter[]> = {};
      for (const item of (userChars ?? []) as UserCharacter[]) {
        if (!byUser[item.user_id]) {
          byUser[item.user_id] = [];
        }

        const characterData = characterBySlug.get(item.character_slug);
        byUser[item.user_id].push({
          slug: item.character_slug,
          name: characterData?.name ?? item.character_slug,
          constellation: Number(item.constellation ?? 0),
          imagePath: characterData?.image_path ?? null,
        });
      }

      for (const currentUserId of Object.keys(byUser)) {
        byUser[currentUserId].sort((a, b) => a.name.localeCompare(b.name));
      }

      setPlayerCharacters(byUser);
    } else {
      setPlayerCharacters({});
    }

    setLoading(false);
  };

  const syncDraftFromServer = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from("rooms")
      .select("status, draft_mode, draft_state, ban_count, pick_count, immunity_count")
      .eq("code", roomCode)
      .maybeSingle();

    if (error || !data) {
      return;
    }

    setRoom((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: data.status ?? prev.status,
        draft_mode: (data.draft_mode as DraftMode | null) ?? prev.draft_mode,
        immunity_count: data.immunity_count ?? prev.immunity_count,
        draft_state: data.draft_state ?? prev.draft_state,
      };
    });

    const syncedDraftMode: DraftMode = data.draft_mode === "dual_roster" ? "dual_roster" : "single_roster";
    const syncedPickLimit = syncedDraftMode === "dual_roster" ? 16 : 8;
    const syncedImmunityCount = syncedDraftMode === "dual_roster" ? 2 : 0;
    const syncedBanPerPlayer = Math.max(1, data.ban_count ?? 2);
    const syncedBanLimit = syncedDraftMode === "dual_roster" ? syncedBanPerPlayer * 2 : syncedBanPerPlayer;
    setDraft(normalizeDraftState(data.draft_state, syncedImmunityCount, syncedBanLimit, syncedPickLimit));
  };

  useEffect(() => {
    if (!roomCode) return;
    loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;

    const timer = window.setInterval(() => {
      void syncDraftFromServer();
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;

    const channel: RealtimeChannel = supabase
      .channel(`room-draft-${roomCode}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${roomCode}` },
        (payload) => {
          const row = payload.new as Partial<Room>;

            setRoom((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                draft_state: row.draft_state ?? prev.draft_state,
                draft_mode: (row.draft_mode as DraftMode | null | undefined) ?? prev.draft_mode,
                immunity_count: row.immunity_count ?? prev.immunity_count,
                status: row.status ?? prev.status,
              };
            });

            if (row.draft_state !== undefined) {
              setDraft(normalizeDraftState(row.draft_state, immunityCount, banLimit, pickLimit));
            }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomCode, immunityCount, banLimit, pickLimit]);

  const leaveRoom = async () => {
    if (!userId || !roomCode) return;

    const { error } = await supabase.from("room_players").delete().eq("room_code", roomCode).eq("user_id", userId);
    if (error) {
      setMessage(formatRoomError(error));
      return;
    }

    router.push("/room");
  };

  const copyCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setMessage("Код скопійовано.");
  };

  const turnText = useMemo(() => {
    if (phase === "done") return "Драфт завершено";
    if (!turnRole) return "Очікування";
    const phasePrefix =
      phase === "immunity" ? "Імун: " : phase === "ban" ? "Бан: " : phase === "pick" ? "Пік: " : "";

    if (turnRole === "host") {
      return `${phasePrefix}${getDisplayName(hostPlayer) || "невідомий"} ходить`;
    }

    return `${phasePrefix}${getDisplayName(guestPlayer) || "невідомий"} ходить`;
  }, [phase, turnRole, hostPlayer, guestPlayer]);

  const turnSecondsForCurrentPhase = useMemo(() => {
    const configured = room?.turn_timer_seconds ?? 0;
    if (!hasGuest || !configured || configured <= 0 || phase === "done" || waitingForReady) return 0;
    if (phase === "immunity" || phase === "ban") return 120;
    return Math.min(Math.max(configured, 120), 240);
  }, [hasGuest, room?.turn_timer_seconds, phase, waitingForReady]);

  const turnTimerRemaining = useMemo(() => {
    const turnSeconds = turnSecondsForCurrentPhase;
    if (!hasGuest || !turnSeconds || turnSeconds <= 0 || phase === "done" || waitingForReady) return null;

    const startTs = draft.turn_started_at ? Date.parse(draft.turn_started_at) : NaN;

    if (!Number.isFinite(startTs)) {
      return turnSeconds;
    }

    const elapsed = Math.floor((nowTs - startTs) / 1000);
    return Math.max(turnSeconds - elapsed, 0);
  }, [hasGuest, turnSecondsForCurrentPhase, draft.turn_started_at, phase, nowTs, waitingForReady]);

  const turnTimerText = useMemo(() => {
    if (waitingForReady) return "Очікуємо готовність";
    if (turnTimerRemaining === null) return "Без таймера";
    const mins = Math.floor(turnTimerRemaining / 60);
    const secs = turnTimerRemaining % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [turnTimerRemaining, waitingForReady]);

  const currentTurnKey = useMemo(
    () =>
      `${phase}:${draft.first_turn_user_id ?? "none"}:${draft.immunities.length}:${draft.bans.length}:${draft.picks.length}:${turnRole ?? "none"}:${draft.turn_started_at ?? "none"}`,
    [phase, draft.first_turn_user_id, draft.immunities.length, draft.bans.length, draft.picks.length, turnRole, draft.turn_started_at]
  );

  useEffect(() => {
    autoTurnLockRef.current = "";
  }, [currentTurnKey]);

  useEffect(() => {
    if (turnSecondsForCurrentPhase <= 0) return;
    if (turnTimerRemaining === null || turnTimerRemaining > 0) return;
    if (phase === "done" || savingDraft || waitingForReady) return;
    if (!turnRole || myRole !== turnRole) return;
    if (!activeSourcePlayer) return;
    if (autoTurnLockRef.current === currentTurnKey) return;

    const available = (playerCharacters[activeSourcePlayer.user_id] ?? []).filter((character) => {
      const isImmuneCharacter = immunitySlugs.has(character.slug);
      const isBlockedByGlobalUse = usedCharacterSlugs.has(character.slug) && !isImmuneCharacter;
      if (isBlockedByGlobalUse) return false;

      if (phase === "pick" && draftMode === "dual_roster") {
        if (isCurrentPickImmuneSlot && !isImmuneCharacter) return false;
        if (!isCurrentPickImmuneSlot && isImmuneCharacter) return false;
      }

      if (phase === "immunity" && draft.immunities.some((item) => item.character_slug === character.slug)) return false;
      if (phase === "ban" && isImmuneCharacter) return false;
      return true;
    });

    if (available.length === 0) {
      autoTurnLockRef.current = currentTurnKey;
      return;
    }

    const randomIndex = Math.floor(Math.random() * available.length);
    const randomCharacter = available[randomIndex];
    autoTurnLockRef.current = currentTurnKey;

    void trySelectCharacter(activeSourcePlayer, randomCharacter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    turnSecondsForCurrentPhase,
    turnTimerRemaining,
    phase,
    savingDraft,
    turnRole,
    myRole,
    waitingForReady,
    draftMode,
    isCurrentPickImmuneSlot,
    immunitySlugs,
    draft.immunities,
    activeSourcePlayer,
    playerCharacters,
    usedCharacterSlugs,
    currentTurnKey,
  ]);

  const renderPlayerPanel = (player: RoomPlayer | null, label: string, showRoster: boolean) => {
    if (!player) {
      return (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-white/45">{label}</p>
          <p className="mt-3 text-sm text-white/60">Очікуємо гравця...</p>
        </div>
      );
    }

    const self = player.user_id === userId;
    const isActiveSource = phase !== "done" && !waitingForReady && player.user_id === activeSourceUserId;
    const displayName = self ? "Ти" : getDisplayName(player);
    const ownedCharacters = showRoster ? playerCharacters[player.user_id] ?? [] : [];

    return (
      <div
        className={`rounded-2xl border bg-gradient-to-b from-slate-900/90 to-[#11192d]/80 p-4 shadow-[0_10px_35px_rgba(2,8,23,0.45)] ${
          isActiveSource ? "border-emerald-300/45 shadow-[0_0_0_1px_rgba(110,231,183,0.35),0_16px_45px_rgba(16,185,129,0.2)]" : "border-white/10"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="mt-1 text-lg font-semibold">{displayName}</p>
          </div>
        </div>

        {!showRoster ? (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-4 text-center text-xs text-white/60">
            Обери ростер для драфту в центрі.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-1">
            {ownedCharacters.length === 0 ? (
              <div className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-4 text-center text-xs text-white/55">
                Колекція порожня
              </div>
            ) : (
              ownedCharacters.map((item) => {
                const isImmuneCharacter = immunitySlugs.has(item.slug);
                const isUsed = usedCharacterSlugs.has(item.slug) && !isImmuneCharacter;
                const isImmuneAlreadyChosen = draft.immunities.some((selection) => selection.character_slug === item.slug);
                const isImmuneAlreadyPickedByThisPlayer =
                  isImmuneCharacter &&
                  draft.picks.some(
                    (selection) => selection.source_user_id === player.user_id && selection.character_slug === item.slug
                  );
                const isDisabled =
                  isUsed ||
                  savingDraft ||
                  phase === "done" ||
                  (phase === "immunity" && isImmuneAlreadyChosen) ||
                  (phase === "pick" && isImmuneAlreadyPickedByThisPlayer);
                return (
                  <button
                    type="button"
                    key={`${player.user_id}-${item.slug}`}
                    onClick={() => void trySelectCharacter(player, item)}
                    disabled={isDisabled}
                    className={`w-[96px] shrink-0 overflow-hidden rounded-xl border bg-black/20 text-left transition ${
                      isDisabled
                        ? "cursor-not-allowed border-white/5 opacity-45 grayscale"
                        : "border-white/10 hover:border-violet-300/40 hover:bg-black/30"
                    }`}
                  >
                    {item.imagePath ? (
                      <Image
                        src={getCharacterImageUrl(item.imagePath)}
                        alt={item.name}
                        width={96}
                        height={76}
                        className="h-[76px] w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-[76px] w-full items-center justify-center bg-white/5 text-[11px] text-white/45">
                        Без зображення
                      </div>
                    )}
                    <div className="px-1.5 py-1">
                      <p className="truncate text-[10px] font-medium text-white/90">{item.name}</p>
                      <p className="text-[9px] text-white/55">C{item.constellation}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSlot = (
    selection: DraftSelection | undefined,
    fallbackLabel: string,
    type: "ban" | "pick",
    index: number,
    compact = false,
    pickOrderNumber?: number,
    highlightImmuneSlot = false,
    removeType: "immunity" | "ban" | "pick" = type
  ) => {
    const slotSizeClass = compact ? "h-[102px] w-[96px]" : "h-[124px] w-[122px]";
    const imageHeightClass = compact ? "h-[76px]" : "h-24";

    if (!selection) {
      const emptySlotTone =
        type === "ban"
          ? "border-red-300/35 bg-red-500/12 text-red-100"
          : highlightImmuneSlot
          ? "border-cyan-300/55 bg-cyan-500/15 text-cyan-100"
          : "border-white/10 bg-black/20 text-white/75";
      return (
        <div
          className={`flex ${slotSizeClass} items-center justify-center rounded-xl border px-2 py-3 text-center text-xs ${emptySlotTone}`}
        >
          <span className="opacity-90">{fallbackLabel}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => void removeSelectionAt(removeType, index)}
        className={`group ${compact ? "w-[96px]" : "w-[122px]"} overflow-hidden rounded-xl border text-center text-xs transition ${
          type === "ban"
            ? "border-red-200/45 bg-red-500/20 text-red-50 hover:bg-red-500/30"
            : highlightImmuneSlot
            ? "border-cyan-200/70 bg-cyan-400/35 text-cyan-50 hover:bg-cyan-400/45"
            : "border-cyan-200/45 bg-cyan-500/22 text-cyan-50 hover:bg-cyan-500/32"
        }`}
      >
        <div className={`flex ${slotSizeClass} flex-col`}>
          {selection.image_path ? (
            <Image
              src={getCharacterImageUrl(selection.image_path)}
              alt={selection.character_name}
              width={122}
              height={96}
              className={`${imageHeightClass} w-full object-cover transition duration-200 group-hover:scale-[1.02]`}
              unoptimized
            />
          ) : (
            <div className={`flex ${imageHeightClass} w-full items-center justify-center bg-black/30 text-[10px] text-white/70`}>?</div>
          )}
          <div
            className={`flex ${compact ? "h-6 text-[10px]" : "h-7 text-[11px]"} items-center justify-center border-t border-white/15 bg-black/55 px-2 text-center font-semibold tracking-wide`}
          >
            {pickOrderNumber ? `#${pickOrderNumber} · ` : ""}C{selection.constellation}
          </div>
        </div>
      </button>
    );
  };

  const renderDualRosterQuarter = (player: RoomPlayer | null, rosterLabel: string) => {
    const isActiveSource = player && phase !== "done" && !waitingForReady && player.user_id === activeSourceUserId;

    if (!player) {
      return (
        <div className="rounded-xl border border-white/10 bg-black/25 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xl font-light text-white/55">&nbsp;</span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-white/45">{rosterLabel}</span>
          </div>
          <div className="mt-3 rounded-xl border border-dashed border-white/15 bg-black/20 px-3 py-8 text-center text-sm text-white/55">
            Очікуємо гравця...
          </div>
        </div>
      );
    }

    const displayName = getDisplayName(player) || "Гравець";
    const ownedCharacters = playerCharacters[player.user_id] ?? [];

    return (
      <div
        className={`rounded-xl border bg-gradient-to-b from-slate-900/90 to-[#11192d]/75 p-3 ${
          isActiveSource
            ? "border-emerald-300/45 shadow-[0_0_0_1px_rgba(110,231,183,0.35),0_14px_35px_rgba(16,185,129,0.22)]"
            : "border-white/10"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-white/90">{displayName}</p>
          </div>
          <span className="text-[11px] uppercase tracking-[0.14em] text-white/45">{rosterLabel}</span>
        </div>

        <div className="mt-1 flex flex-wrap gap-1">
          {ownedCharacters.length === 0 ? (
            <div className="col-span-full rounded-xl border border-white/10 bg-black/20 px-3 py-4 text-center text-xs text-white/55">
              Колекція порожня
            </div>
          ) : (
            ownedCharacters.map((item) => {
              const isImmuneCharacter = immunitySlugs.has(item.slug);
              const isUsed = usedCharacterSlugs.has(item.slug) && !isImmuneCharacter;
              const isImmuneAlreadyChosen = draft.immunities.some((selection) => selection.character_slug === item.slug);
              const isImmuneAlreadyPickedByThisPlayer =
                isImmuneCharacter &&
                draft.picks.some((selection) => selection.source_user_id === player.user_id && selection.character_slug === item.slug);
              const isDisabled =
                isUsed ||
                savingDraft ||
                phase === "done" ||
                (phase === "immunity" && isImmuneAlreadyChosen) ||
                (phase === "pick" && isImmuneAlreadyPickedByThisPlayer);
              return (
                <button
                  type="button"
                  key={`${player.user_id}-${item.slug}`}
                  onClick={() => void trySelectCharacter(player, item)}
                  disabled={isDisabled}
                  className={`w-[96px] shrink-0 overflow-hidden rounded-xl border bg-black/25 text-left transition ${
                    isDisabled
                      ? "cursor-not-allowed border-white/5 opacity-45 grayscale"
                      : "border-white/10 hover:border-violet-300/40 hover:bg-black/35"
                  }`}
                >
                  {item.imagePath ? (
                    <Image
                      src={getCharacterImageUrl(item.imagePath)}
                      alt={item.name}
                      width={96}
                      height={76}
                      className="h-[76px] w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-[76px] w-full items-center justify-center bg-white/5 text-[10px] text-white/45">
                      Без фото
                    </div>
                  )}
                  <div className="px-1.5 py-1">
                    <p className="truncate text-[10px] font-medium text-white/90">{item.name}</p>
                    <p className="text-[9px] text-white/55">C{item.constellation}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderDualSelectionQuarter = (
    title: string,
    immunitySlots: IndexedDraftSelection[],
    immunitySlotCount: number,
    banSlots: IndexedDraftSelection[],
    banSlotCount: number,
    pickSlots: IndexedDraftSelection[],
    pickSlotCount: number,
    pickOrderNumbers: number[],
    keyPrefix: string
  ) => {
    return (
      <div className="rounded-xl border border-white/10 bg-black/25 p-3">
        <p className="text-sm font-semibold text-white/85">{title}</p>
        <p className="mt-4 text-[11px] uppercase tracking-[0.12em] text-white/55">Імунітети</p>
        <div className="mt-1 flex flex-wrap justify-center gap-1">
          {Array.from({ length: immunitySlotCount }, (_, slotIndex) => {
            const item = immunitySlots[slotIndex];
            return (
              <div key={`${keyPrefix}-immunity-${slotIndex}`}>
                {renderSlot(item?.selection, `IMMUNE ${slotIndex + 1}`, "pick", item?.index ?? -1, true, undefined, true, "immunity")}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-white/55">Бани</p>
        <div className="mt-1 flex flex-wrap justify-center gap-1">
          {Array.from({ length: banSlotCount }, (_, slotIndex) => {
            const item = banSlots[slotIndex];
            return (
              <div key={`${keyPrefix}-ban-${slotIndex}`}>
                {renderSlot(item?.selection, `BAN ${slotIndex + 1}`, "ban", item?.index ?? -1, true)}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-white/55">Піки</p>
        <div className="mt-1 flex justify-center">
          <div className="grid grid-cols-[repeat(4,max-content)] gap-1">
            {Array.from({ length: pickSlotCount }, (_, slotIndex) => {
              const item = pickSlots[slotIndex];
              const pickOrderNumber = pickOrderNumbers[slotIndex];
              const isImmuneSlot = IMMUNE_PICK_SLOT_INDEXES.includes(slotIndex as (typeof IMMUNE_PICK_SLOT_INDEXES)[number]);
              return (
                <div key={`${keyPrefix}-pick-${slotIndex}`}>
                  {renderSlot(
                    item?.selection,
                    pickOrderNumber ? `PICK #${pickOrderNumber}` : `PICK ${slotIndex + 1}`,
                    "pick",
                    item?.index ?? -1,
                    true,
                    pickOrderNumber,
                    isImmuneSlot
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,_rgba(56,189,248,0.16),_transparent_32%),radial-gradient(circle_at_90%_6%,_rgba(167,139,250,0.18),_transparent_34%),linear-gradient(to_bottom,_#070b14,_#0b1222,_#0a1020)] px-4 py-8 text-white sm:px-6 xl:px-10">
      <section className="mx-auto w-full max-w-[1800px] rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(3,7,18,0.55)] backdrop-blur md:p-7 xl:p-8">
        <p className="text-sm uppercase tracking-[0.22em] text-violet-200/80">Кімната</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">Код: {roomCode || "—"}</h1>
          <button
            type="button"
            onClick={copyCode}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
          >
            Скопіювати код
          </button>
        </div>

        {!loading && room && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {timerEnabled && hasGuest && !bothPlayersReady && myRole !== "observer" && (
                <button
                  type="button"
                  onClick={() => void setCurrentUserReady()}
                  disabled={savingDraft || isCurrentUserReady}
                  className="rounded-lg border border-emerald-200/60 bg-emerald-500/35 px-3 py-2 text-sm font-semibold text-emerald-50 hover:bg-emerald-500/45 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCurrentUserReady ? "Ти готовий" : "ГОТОВИЙ"}
                </button>
              )}
              <span className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/80">{turnText}</span>
              <span className="rounded-lg border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                Таймер ходу: {turnTimerText}
              </span>
              {timerEnabled && hasGuest && waitingForReady && (
                <span className="rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                  Готові: {readyUserIds.length}/2
                </span>
              )}
              {draftMode === "dual_roster" && hasGuest && (
                <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2 py-1">
                  <span className="text-[11px] text-white/65">Першим ходить:</span>
                  <select
                    value={firstTurnUserId ?? ""}
                    onChange={(event) => void setFirstTurnUser(event.target.value)}
                    disabled={!isHost || savingDraft || isDualDraftStarted}
                    className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {hostPlayer?.user_id && (
                      <option value={hostPlayer.user_id} className="bg-slate-900 text-white">
                        {getDisplayName(hostPlayer) || "Гравець 1"}
                      </option>
                    )}
                    {guestPlayer?.user_id && (
                      <option value={guestPlayer.user_id} className="bg-slate-900 text-white">
                        {getDisplayName(guestPlayer) || "Гравець 2"}
                      </option>
                    )}
                    <option value="random" className="bg-slate-900 text-white">
                      Випадково
                    </option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void resetDraftSelections()}
                disabled={!isHost || savingDraft}
                title={isHost ? "Очистити всі імуни/бани/піки" : "Доступно тільки гравцю 1"}
                className="rounded-lg border border-rose-300/30 bg-rose-400/15 px-3 py-1 text-sm text-rose-100 hover:bg-rose-400/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Скинути все
              </button>
              <button
                type="button"
                onClick={loadRoom}
                className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-sm hover:bg-white/15"
              >
                Оновити
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 md:p-5">

          {loading ? (
            <p className="text-sm text-white/70">Завантаження кімнати...</p>
          ) : (
            <div
              className={`grid gap-4 xl:gap-5 2xl:gap-6 ${
                draftMode === "dual_roster"
                  ? "grid-cols-1"
                  : "xl:grid-cols-[minmax(540px,1.3fr)_minmax(460px,1fr)]"
              }`}
            >
              {draftMode === "dual_roster" ? (
                <div className="relative p-1 md:p-2">
                  <div className="relative grid gap-2 lg:grid-cols-2">
                    {renderDualSelectionQuarter(
                      `${getDisplayName(hostPlayer) || "Гравець 1"}`,
                      indexedImmunities,
                      immunityCount,
                      hostBanSelections,
                      banPerPlayer,
                      hostPickSelections,
                      Math.ceil(pickLimit / 2),
                      dualPickOrderNumbers.host,
                      "host"
                    )}
                    {renderDualSelectionQuarter(
                      `${getDisplayName(guestPlayer) || "Гравець 2"}`,
                      indexedImmunities,
                      immunityCount,
                      guestBanSelections,
                      banPerPlayer,
                      guestPickSelections,
                      Math.floor(pickLimit / 2),
                      dualPickOrderNumbers.guest,
                      "guest"
                    )}
                    {renderDualRosterQuarter(hostPlayer, "Персонажі")}
                    {renderDualRosterQuarter(guestPlayer, "Персонажі")}
                  </div>
                </div>
              ) : (
                <>
                  <div className="order-1 xl:order-2 rounded-2xl border border-violet-300/20 bg-gradient-to-b from-violet-500/16 to-indigo-500/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                      <p className="mb-2 text-center text-[11px] uppercase tracking-[0.12em] text-white/60">Кому банимо/пікаємо</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => hostPlayer && void setDraftTargetUser(hostPlayer.user_id)}
                          disabled={!hostPlayer || isTargetSelectionLocked || savingDraft}
                          className={`rounded-lg border px-2 py-2 text-xs ${
                            selectedSingleRosterUserId === hostPlayer?.user_id
                              ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                              : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
                          } ${isTargetSelectionLocked ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          {getDisplayName(hostPlayer) || "Гравець 1"}
                        </button>
                        <button
                          type="button"
                          onClick={() => guestPlayer && void setDraftTargetUser(guestPlayer.user_id)}
                          disabled={!guestPlayer || isTargetSelectionLocked || savingDraft}
                          className={`rounded-lg border px-2 py-2 text-xs ${
                            selectedSingleRosterUserId === guestPlayer?.user_id
                              ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
                              : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
                          } ${isTargetSelectionLocked ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          {getDisplayName(guestPlayer) || "Гравець 2"}
                        </button>
                      </div>
                      <p className="mt-2 text-center text-[10px] text-white/55">
                        {isTargetSelectionLocked
                          ? "Вибір зафіксовано після першого бану/піку."
                          : "Обери гравця перед стартом драфту."}
                      </p>
                    </div>

                    <div className="mt-3">
                      <p className="text-center text-xs uppercase tracking-[0.12em] text-white/55">Бани</p>
                      <div className="mt-2 grid grid-cols-2 justify-items-center gap-2">
                        {Array.from({ length: banLimit }, (_, index) => (
                          <div key={`single-ban-${index}`}>{renderSlot(draft.bans[index], `BAN ${index + 1}`, "ban", index)}</div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <p className="text-center text-xs uppercase tracking-[0.12em] text-white/55">Піки</p>
                        <div className="mt-2">
                          <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: pickLimit }, (_, index) => (
                              <div key={`single-pick-${index}`} className="grid content-start justify-items-center gap-2">
                                {renderSlot(draft.picks[index], `PICK ${index + 1}`, "pick", index)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="order-2 xl:order-1">
                    {renderPlayerPanel(
                      sortedPlayers.find((player) => player.user_id === selectedSingleRosterUserId) ?? null,
                      "Ростер драфту",
                      true
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {message && <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">{message}</div>}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/room" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
            До лобі кімнат
          </Link>
          <Link href="/" className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
            На головну
          </Link>
          <button
            type="button"
            onClick={leaveRoom}
            className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/15"
          >
            Вийти з кімнати
          </button>
        </div>
      </section>
    </main>
  );
}
