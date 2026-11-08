/** 資料層：匯入 data/*.json 並提供型別。所有遊戲內容都由這些 JSON 驅動。 */
import mapsJson from '../../data/maps.json';
import monstersJson from '../../data/monsters.json';
import itemsJson from '../../data/items.json';
import skillsJson from '../../data/skills.json';
import jobsJson from '../../data/jobs.json';
import questsJson from '../../data/quests.json';
import npcsJson from '../../data/npcs.json';
import shopsJson from '../../data/shops.json';
import lootJson from '../../data/loot.json';

export type XY = [number, number];
export interface MapDef {
  id: string; name: string; type: 'town' | 'field' | 'dungeon';
  w: number; h: number; seed: number; base: string; bgm: string;
  level?: XY; border?: 'forest' | 'pine' | 'palm' | 'dead' | 'rock' | 'wall';
  dark?: number; tint?: string;
  areas?: { t: string; shape: 'circle' | 'rect' | 'blob'; x: number; y: number; r?: number; w?: number; h?: number }[];
  roads?: { t: string; width: number; pts: XY[] }[];
  rooms?: [number, number, number, number][];
  corridors?: { width: number; pts: XY[] }[];
  props?: { type: string; x: number; y: number; v?: number }[];
  scatter?: { type: string; n: number; v?: number[]; on?: string[]; ring?: number; minRing?: number }[];
  clearings?: { x: number; y: number; r: number }[];
  portals: { x: number; y: number; to: string; tx: number; ty: number }[];
  npcs?: { id: string; x: number; y: number; dir?: number }[];
  spawns?: { m: string; n: number }[];
  mvp?: { m: string; x: number; y: number; respawn: number };
  pos: XY;
}
export interface Look {
  body?: string;            // 怪物外形：slime/bug/rabbit/plant/bat/mushroom/wolf/humanoid/golem/ghost/crab/bee/snake/flower/bird/fish
  color?: string; color2?: string; eye?: string;
  hair?: string; skin?: string; cloth?: string; cloth2?: string; pants?: string; hairStyle?: number;
  weapon?: string; hat?: string; scale?: number; sheet?: string; cape?: string; mouth?: string;
}
export interface DropDef { item: string; rate: number }
export interface MonsterDef {
  id: string; name: string; lv: number; hp: number; atk: XY; def: number; mdef: number;
  str: number; agi: number; vit: number; int: number; dex: number; luk: number;
  exp: number; jexp: number; range: number; adelay: number; speed: number;
  aggro: boolean; assist?: boolean; mvp?: boolean; element?: string;
  frame: number; look: Look; drops: DropDef[]; skills?: { id: string; chance: number }[];
}
export interface ItemDef {
  id: string; name: string; type: 'use' | 'etc' | 'weapon' | 'armor' | 'card';
  price: number; weight: number; desc: string;
  icon: { k: string; c?: string; c2?: string };
  heal?: number; healSp?: number; healPct?: number; buff?: string;
  slot?: 'weapon' | 'head' | 'armor' | 'shield' | 'garment' | 'shoes' | 'acc';
  wtype?: 'dagger' | 'sword' | 'staff' | 'bow' | 'spear';
  atk?: number; matk?: number; def?: number; mdef?: number; slots?: number; wlv?: number;
  jobs?: string[]; reqLv?: number;
  bonus?: Partial<Record<'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk' | 'hp' | 'sp' | 'atk' | 'matk' | 'def' | 'flee' | 'hit' | 'crit' | 'aspd', number>>;
  cardFor?: string; bossEx?: string;
}
export interface SkillDef {
  id: string; name: string; job: string; maxLv: number; type: 'active' | 'passive';
  target: 'enemy' | 'self' | 'ground'; icon: { k: string; c: string };
  sp: number[]; cast: number[]; cd: number[]; range: number;
  power?: number[]; hits?: number | string; aoe?: number; element?: string; knock?: number; dmg?: 'magic' | 'phys';
  effect: string; fx: string; desc: string; req?: { id: string; lv: number }[];
  value?: number[]; dur?: number[];
}
export interface JobDef {
  id: string; name: string; tier: number; hpK: number; spK: number; hpB: number; spB: number;
  aspd: Record<string, number>; weapons: string[]; skills: string[]; maxJob: number;
  prev?: string;
  attack: "melee" | "magic" | "arrow"; range: number; look: Look; bonus: [number, string][];
}
export interface QuestDef {
  id: string; name: string; npc: string; type: 'kill' | 'collect' | 'talk';
  target: string; count: number; reqLv?: number; prev?: string; job?: string;
  desc: string; done: string; reward: { exp?: number; jexp?: number; zeny?: number; items?: [string, number][] };
  repeat?: boolean; consume?: boolean; trial?: string;
}
export interface DialogNode { text: string | string[]; opts?: { label: string; go?: string; act?: string; arg?: string; cond?: string }[]; act?: string; arg?: string; go?: string }
export interface NpcDef { id: string; name: string; look: Look; title?: string; shop?: string; dialog: Record<string, DialogNode>; mark?: string }
export interface ShopDef { id: string; name: string; items: string[] }

export const MAPS = mapsJson as unknown as MapDef[];
export const MONSTERS = monstersJson as unknown as MonsterDef[];
export const ITEMS = itemsJson as unknown as ItemDef[];
export const SKILLS = skillsJson as unknown as SkillDef[];
export const JOBS = jobsJson as unknown as { jobs: JobDef[]; expBase: number[]; expJob: number[]; expJob1: number[]; expJob2: number[] };
export const QUESTS = questsJson as unknown as QuestDef[];
export const NPCS = npcsJson as unknown as NpcDef[];
export const SHOPS = shopsJson as unknown as ShopDef[];
export const LOOT = lootJson as unknown as LootConfig;
export type Rarity = 'common' | 'magic' | 'rare' | 'legend' | 'boss';
export interface LootConfig {
  rarities: { id: Rarity; name: string; color: string; affixes: number }[];
  monsterRarityWeights: Record<string, number>; bossRarityWeights: Record<string, number>; cardRarity: Rarity;
  mainStatRange: Record<Rarity, [number, number]>; itemRanges: Record<string, [number, number]>; perfect: number;
  affixes: Record<string, { name: string; fmt: string; range: [number, number]; elements?: Record<string, string> }>; affixBossBonus: number;
  boss: Record<string, { zeny: [number, number]; material: string; materialCount: [number, number]; equipChance: number; exclusiveChance: number; cardChance: number; card: string; exclusives: string[] }>;
  ownJobChance: number; pity: number;
  dismantle: Record<string, any> & { materialByWeaponLevel: Record<string, string>; defaultMaterial: string };
  exchange: { cost: Record<string, number>; items: string[] }[];
  fx: { pillarFrom: Rarity; bigFrom: Rarity; hitStop: number; shake: number };
}

const idx = <T extends { id: string }>(a: T[]) => { const m: Record<string, T> = {}; for (const x of a) m[x.id] = x; return m; };
export const DB = {
  map: idx(MAPS), monster: idx(MONSTERS), item: idx(ITEMS), skill: idx(SKILLS),
  job: idx(JOBS.jobs), quest: idx(QUESTS), npc: idx(NPCS), shop: idx(SHOPS),
};
