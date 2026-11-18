import test from 'node:test';
import assert from 'node:assert/strict';
import { heartsNow, loseHeart, gainHeart, canPlay, msToNextHeart } from '../js/hearts.js';
import { defaultState } from '../js/storage.js';

const H = 3600000;
const T0 = Date.UTC(2026, 0, 1);
const mk = () => defaultState(T0);

test('empieza con 5 y cada error resta uno', () => {
  const st = mk();
  assert.equal(heartsNow(st, T0), 5);
  assert.equal(loseHeart(st, T0), 4);
  assert.equal(loseHeart(st, T0), 3);
});
test('sin corazones no se puede jugar', () => {
  const st = mk();
  for (let i = 0; i < 7; i++) loseHeart(st, T0);
  assert.equal(heartsNow(st, T0), 0);
  assert.equal(canPlay(st, T0), false);
});
test('recupera 1 cada 4 horas (configurable)', () => {
  const st = mk();
  for (let i = 0; i < 5; i++) loseHeart(st, T0);
  assert.equal(heartsNow(st, T0 + 3 * H), 0);
  assert.equal(heartsNow(st, T0 + 4 * H), 1);
  assert.equal(heartsNow(st, T0 + 9 * H), 2);
  assert.equal(msToNextHeart(st, T0 + 9 * H), 3 * H);
  st.settings.heartHours = 1;
  assert.equal(heartsNow(st, T0 + 12 * H), 5);
});
test('no pasa del máximo', () => {
  const st = mk();
  assert.equal(heartsNow(st, T0 + 100 * H), 5);
  assert.equal(gainHeart(st, T0), 5);
});
test('perder un corazón con 5 empieza a contar desde ese momento', () => {
  const st = mk();
  loseHeart(st, T0 + 10 * H);
  assert.equal(heartsNow(st, T0 + 13 * H), 4);
  assert.equal(heartsNow(st, T0 + 14 * H), 5);
});
test('una práctica da un corazón', () => {
  const st = mk();
  for (let i = 0; i < 5; i++) loseHeart(st, T0);
  assert.equal(gainHeart(st, T0), 1);
  assert.equal(canPlay(st, T0), true);
});
test('modo ilimitado: no se pierden corazones', () => {
  const st = mk();
  st.settings.heartsUnlimited = true;
  for (let i = 0; i < 20; i++) loseHeart(st, T0);
  assert.equal(heartsNow(st, T0), 5);
  assert.equal(canPlay(st, T0), true);
  assert.equal(msToNextHeart(st, T0), 0);
});
