import * as translate_pick from './translate_pick.js';
import * as tn_to_es_choice from './tn_to_es_choice.js';
import * as listen_choose from './listen_choose.js';
import * as listen_type from './listen_type.js';
import * as speak from './speak.js';
import * as match_pairs from './match_pairs.js';
import * as fill_blank from './fill_blank.js';
import * as order_words from './order_words.js';
import * as dialogue_reply from './dialogue_reply.js';

export const byType = { translate_pick, tn_to_es_choice, listen_choose, listen_type, speak, match_pairs, fill_blank, order_words, dialogue_reply };
export const ALL_TYPES = Object.keys(byType);
/** Tipos que se asignan por ítem (match_pairs y dialogue_reply se insertan aparte). */
export const ITEM_TYPES = ['tn_to_es_choice', 'listen_choose', 'translate_pick', 'listen_type', 'fill_blank', 'order_words', 'speak'];
export const RECOGNITION = ['tn_to_es_choice', 'listen_choose'];
