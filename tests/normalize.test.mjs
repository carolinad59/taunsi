import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, isCorrect, similarity, scoreSpeech, SPEECH_PASS, normalizeArabic } from '../js/normalize.js';

test('minúsculas, tildes y signos', () => {
  assert.equal(normalize('  ¡Ahla, Labes?  '), 'ahla labes');
  assert.equal(normalize('Béhi!'), 'behi');
});
test('dobles letras se reducen (aa ~ a, ii ~ i)', () => {
  assert.equal(normalize('Mercii'), normalize('Merci'));
  assert.equal(normalize('baaba'), normalize('baba'));
});
test('sh=ch, q=9, gh=8, kh=5, ou=u, apóstrofo=3', () => {
  assert.equal(normalize('shay'), normalize('chay'));
  assert.equal(normalize('qahwa'), normalize('9ahwa'));
  assert.equal(normalize('ghali'), normalize('8ali'));
  assert.equal(normalize('khobz'), normalize('5obz'));
  assert.equal(normalize('Tounes'), normalize('Tunes'));
  assert.equal(normalize("'awed"), normalize('3awed'));
});
test('guion y espacios equivalen: el-kheir = el kheir', () => {
  assert.equal(normalize('Sbah el-kheir'), normalize('sbah el kheir'));
});
test('un dígito cambiado es un error salvo que esté en alt', () => {
  const item = { tn: '7out', alt: ['hout'] };
  assert.ok(isCorrect('7out', item));
  assert.ok(isCorrect('hout', item));            // variante listada
  assert.ok(!isCorrect('3out', item));            // 7 → 3 cambia el sonido
  assert.ok(!isCorrect('9out', item));
  const noAlt = { tn: '9alb' };
  assert.ok(!isCorrect('2alb', noAlt));           // 9 vs 2 solo vale si está en alt
  assert.ok(isCorrect('2alb', { tn: '9alb', alt: ['2alb'] }));
});
test('isCorrect acepta tn, alt y rechaza vacío', () => {
  const item = { tn: 'Ahla', alt: ['ahlan'] };
  assert.ok(isCorrect('ahla', item));
  assert.ok(isCorrect('AHLAN!', item));
  assert.ok(!isCorrect('', item));
  assert.ok(!isCorrect('bslama', item));
});
test('isCorrect ignora espacios de más entre palabras', () => {
  assert.ok(isCorrect('Merci   barcha', { tn: 'Merci barcha' }));
  assert.ok(isCorrect('mercibarcha', { tn: 'Merci barcha' }));
});
test('similarity y scoreSpeech (latino y árabe)', () => {
  assert.equal(similarity('abc', 'abc'), 1);
  assert.ok(similarity('abc', 'xyz') < 0.1);
  const item = { tn: 'Labes', ar: 'لاباس' };
  assert.ok(scoreSpeech('labes', item) >= SPEECH_PASS);
  assert.ok(scoreSpeech('لاباس', item) >= SPEECH_PASS);
  assert.ok(scoreSpeech('bslama', item) < SPEECH_PASS);
  assert.equal(scoreSpeech('', item), 0);
  assert.equal(normalizeArabic('لَاباس'), 'لاباس');
});
