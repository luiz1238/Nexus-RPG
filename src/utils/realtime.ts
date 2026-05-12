import type { Equipment, Item, PlayerEquipment, PlayerItem, Spell } from '@prisma/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { TradeType } from '../components/Modals/PlayerTradeModal';
import type { DiceRequest, DiceResponse } from './dice';

export type PlayerNameChangeEvent = (playerId: number, value: string) => void;
export type PlayerNameShowChangeEvent = (playerId: number, show: boolean) => void;
export type PlayerAttributeStatusChangeEvent = (playerId: number, attStatusId: number, value: boolean) => void;
export type PlayerInfoChangeEvent = (playerId: number, infoId: number, value: string) => void;
export type PlayerAttributeChangeEvent = (playerId: number, attributeId: number, value: number, maxValue: number, show: boolean) => void;
export type PlayerSpecChangeEvent = (playerId: number, specId: number, value: string) => void;
export type PlayerCurrencyChangeEvent = (playerId: number, currencyId: number, value: string) => void;
export type PlayerCharacteristicChangeEvent = (playerId: number, characteristicId: number, value: number, modifier: number) => void;
export type PlayerSkillChangeEvent = (playerId: number, skillId: number, value: number, modifier: number) => void;
export type PlayerEquipmentAddEvent = (playerId: number, equipment: Equipment) => void;
export type PlayerEquipmentRemoveEvent = (playerId: number, id: number) => void;
export type PlayerItemAddEvent = (playerId: number, item: Item, currentDescription: string, quantity: number) => void;
export type PlayerItemRemoveEvent = (playerId: number, id: number) => void;
export type PlayerItemChangeEvent = (playerId: number, itemID: number, currentDescription: string, quantity: number) => void;
export type PlayerSpellAddEvent = (playerId: number, spell: Spell) => void;
export type PlayerSpellRemoveEvent = (playerId: number, spellId: number) => void;
export type PlayerMaxLoadChangeEvent = (playerId: number, newLoad: number) => void;
export type PlayerSpellSlotsChangeEvent = (playerId: number, newSpellSlots: number) => void;
export type EnvironmentChangeEvent = (newValue: string) => void;
export type PlayerDeleteEvent = () => void;
export type SkillAddEvent = (id: number, name: string, specializationName: string | null) => void;
export type SkillRemoveEvent = (id: number) => void;
export type SkillChangeEvent = (id: number, name: string, specializationName: string | null) => void;
export type EquipmentAddEvent = (id: number, name: string) => void;
export type EquipmentRemoveEvent = (id: number) => void;
export type EquipmentChangeEvent = (equipment: Equipment) => void;
export type ItemAddEvent = (id: number, name: string) => void;
export type ItemRemoveEvent = (id: number) => void;
export type ItemChangeEvent = (item: Item) => void;
export type SpellAddEvent = (id: number, name: string) => void;
export type SpellRemoveEvent = (id: number) => void;
export type SpellChangeEvent = (spell: Spell) => void;
export type DiceRollEvent = () => void;
export type DiceResultEvent = (playerId: number, results: DiceResponse[], dices: DiceRequest | DiceRequest[]) => void;
export type PlayerTradeRequestEvent = (type: TradeType, tradeId: number, receiverObjectId: number | null, senderName: string, senderObjectName: string) => void;

type EquipmentTradeObject = { type: 'equipment'; obj: PlayerEquipment & { Equipment: Equipment } };
type ItemTradeObject = { type: 'item'; obj: PlayerItem & { Item: Item } };
type TradeObject = EquipmentTradeObject | ItemTradeObject;
export type PlayerTradeResponseEvent = (accept: boolean, object?: TradeObject) => void;

export interface BroadcastPayloads {
  playerNameChange: { playerId: number; value: string };
  playerNameShowChange: { playerId: number; show: boolean };
  playerAttributeStatusChange: { playerId: number; attStatusId: number; value: boolean };
  playerInfoChange: { playerId: number; infoId: number; value: string };
  playerAttributeChange: { playerId: number; attributeId: number; value: number; maxValue: number; show: boolean };
  playerSpecChange: { playerId: number; specId: number; value: string };
  playerCurrencyChange: { playerId: number; currencyId: number; value: string };
  playerCharacteristicChange: { playerId: number; characteristicId: number; value: number; modifier: number };
  playerSkillChange: { playerId: number; skillId: number; value: number; modifier: number };
  playerEquipmentAdd: { playerId: number; equipment: Equipment };
  playerEquipmentRemove: { playerId: number; id: number };
  playerItemAdd: { playerId: number; item: Item; currentDescription: string; quantity: number };
  playerItemRemove: { playerId: number; id: number };
  playerItemChange: { playerId: number; itemID: number; currentDescription: string; quantity: number };
  playerSpellAdd: { playerId: number; spell: Spell };
  playerSpellRemove: { playerId: number; spellId: number };
  playerMaxLoadChange: { playerId: number; newLoad: number };
  playerSpellSlotsChange: { playerId: number; newSpellSlots: number };
  playerDelete: { playerId: number };
  skillAdd: { id: number; name: string; specializationName: string | null };
  skillRemove: { id: number };
  skillChange: { id: number; name: string; specializationName: string | null };
  equipmentAdd: { id: number; name: string };
  equipmentRemove: { id: number };
  equipmentChange: { equipment: Equipment };
  itemAdd: { id: number; name: string };
  itemRemove: { id: number };
  itemChange: { item: Item };
  spellAdd: { id: number; name: string };
  spellRemove: { id: number };
  spellChange: { spell: Spell };
  environmentChange: { value: string };
  diceRoll: { playerId: number };
  diceResult: { playerId: number; results: DiceResponse[]; dices: DiceRequest | DiceRequest[]; toAdmin?: boolean };
  playerTradeRequest: { type: TradeType; tradeId: number; receiverObjectId: number | null; senderName: string; senderObjectName: string };
  playerTradeResponse: { accept: boolean; object?: TradeObject };
}

export type BroadcastEventName = keyof BroadcastPayloads;

const CHANNEL_NAME = 'nexus-rpg';

export function getRealtimeChannel(supabase: { channel: (name: string) => RealtimeChannel }): RealtimeChannel {
  return supabase.channel(CHANNEL_NAME);
}
