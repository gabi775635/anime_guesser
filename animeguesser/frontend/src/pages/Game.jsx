import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import { useSearchParams, useNavigate } from '@solidjs/router';
import AppLayout from '../components/AppLayout';
import { api } from '../api/client';
import { scoreColor, scoreRank } from '../utils/score';

const TOTAL_ROUNDS      = 10;
const MAX_PER_ROUND     = 100; // 10 × 100 = 1000
const TIMER_DURATION_MS = 15000;

export default function Game() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const mode       = () => params.mode || 'description';

  // Game state
  const [sessionId,  setSessionId]  = createSignal(null);
  const [round,      setRound]      = createSignal(null);
  const [roundNum,   setRoundNum]   = createSignal(0);
  const [score,      setScore]      = createSignal(0);
  const [history,    setHistory]    = createSignal([]);
  const [answer,     setAnswer]     = createSignal('');
  const [feedback,   setFeedback]   = createSignal(null); // { msg, correct }
  const [timerPct,   setTimerPct]   = createSignal(100);
  const [timerColor, setTimerColor] = createSignal('var(--teal)');
  const [ended,      setEnded]      = createSignal(false);
  const [startTime,  setStartTime]  = createSignal(null);

  let timerInterval = null;

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const start = Date.now();
    timerInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / TIMER_DURATION_MS * 100));
      setTimerPct(pct);
      setTimerColor(pct < 30 ? 'var(--accent)' : pct < 60 ? 'var(--gold)' : 'var(--teal)');
      if (pct <= 0) { clearInterval(timerInterval); submitAnswer(true); }
    }, 100);
  }

  onCleanup(() => { if (timerInterval) clearInterval(timerInterval); });

  async function initGame() {
    setScore(0); setHistory([]); setRoundNum(0); setEnded(false); setFeedback(null);
    try {
      const s = await api('POST', '/game/session/start', { mode: mode() });
      setSessionId(s.session_id);
      await loadNextRound();
    } catch (e) { setFeedback({ msg: 'Erreur: ' + e.message, correct: false }); }
  }

  async function loadNextRound() {
    const next = roundNum() + 1;
    if (next > TOTAL_ROUNDS) return showEnd();
    setRoundNum(next);
    setAnswer('');
    setFeedback(null);
    setTimerPct(100);
    try {
      const r = await api('GET', `/game/round?mode=${mode()}`);
      setRound(r);
      setStartTime(Date.now());
      startTimer();
    } catch (e) { setFeedback({ msg: 'Erreur chargement: ' + e.message, correct: false }); }
  }

  async function submitAnswer(timeout = false) {
    if (!round()) return;
    if (timerInterval) clearInterval(timerInterval);
    const ans       = timeout ? '' : answer().trim();
    const timeTaken = Date.now() - (startTime() ?? Date.now());
    try {
      const r = await api('POST', '/game/session/answer', {
        session_id:    sessionId(),
        round_id:      round().round_id,
        answer:        ans || '—',
        time_taken_ms: timeTaken,
      });
      const pts = Math.round((r.points_earned / 1000) * MAX_PER_ROUND);
      setScore(s => s + pts);
      setHistory(h => [...h, {
        correct:       r.is_correct,
        points:        pts,
        correctAnswer: r.correct_answer,
        skipped:       timeout && !ans,
      }]);
      setFeedback({
        msg:     r.is_correct ? `✓ Bonne réponse ! +${pts} pts` : (timeout ? `⏱ Temps écoulé — C'était : ${r.correct_answer}` : `✗ C'était : ${r.correct_answer}`),
        correct: r.is_correct,
      });
      setTimeout(() => loadNextRound(), 1800);
    } catch (e) { setFeedback({ msg: 'Erreur: ' + e.message, correct: false }); }
  }

  async function showEnd() {
    if (timerInterval) clearInterval(timerInterval);
    await api('POST', '/game/session/end', { session_id: sessionId() }).catch(() => {});
    setEnded(true);
  }

  async function quitGame() {
    if (timerInterval) clearInterval(timerInterval);
    if (sessionId()) await api('POST', '/game/session/end', { session_id: sessionId() }).catch(() => {});
    navigate('/home');
  }

  // Score display helpers
  const totalMax   = () => TOTAL_ROUNDS * MAX_PER_ROUND;
  const scorePct   = () => Math.round(score() / totalMax() * 100);
  const scoreCol   = () => scoreColor(score(), totalMax());
  const rank       = () => scoreRank(score(), totalMax());

  // Dot status for each round
  function dotClass(i) {
    const h = history()[i];
    if (!h) return i === roundNum() - 1 ? 'current' : 'pending';
    if (h.skipped) return 'skipped';
    return h.correct ? 'correct' : 'wrong';
  }
  function dotLabel(i) {
    const h = history()[i];
    if (!h) return String(i + 1);
    if (h.skipped) return String(i + 1);
    return h.correct ? '✓' : '✗';
  }

  // Kick off game on mount
  initGame();

  return (
    <AppLayout>
      <div class="page">
        <div class="game-container">

          {/* Score Tracker */}
          <div class="score-tracker">
            <div class="score-main">
              <div class="score-current" style={{ color: scoreCol() }}>{score()}</div>
              <div class="score-max">/ {totalMax()}</div>
            </div>
            <div class="score-bar-wrap">
              <div class="score-bar-track">
                <div class="score-bar-fill" style={{ width: scorePct() + '%', background: scoreCol() }} />
              </div>
              <div class="round-history">
                <For each={Array.from({ length: TOTAL_ROUNDS }, (_, i) => i)}>
                  {(i) => (
                    <div class={`round-dot ${dotClass(i)}`} title={history()[i]?.correctAnswer ?? ''}>
                      {dotLabel(i)}
                    </div>
                  )}
                </For>
              </div>
            </div>
            <div class="score-rank-display" style={{ color: scoreCol() }}>{rank()}</div>
          </div>

          {/* Game area */}
          <Show when={!ended()}>
            <div class="game-header">
              <span style="font-size:13px;color:var(--text3)">Round {roundNum()}/{TOTAL_ROUNDS}</span>
              <div class="game-progress-bar">
                <div class="game-progress-fill" style={{ width: ((roundNum() - 1) / TOTAL_ROUNDS * 100) + '%' }} />
              </div>
              <span style="font-size:13px;color:var(--text3)">{mode()}</span>
            </div>

            <div class="timer-bar">
              <div class="timer-fill" style={{ width: timerPct() + '%', background: timerColor() }} />
            </div>

            <div class="game-card">
              <Show when={round()?.mode === 'screenshot' || round()?.mode === 'portrait'}>
                <img
                  class={`game-image${round()?.mode === 'screenshot' ? ' blurred' : ''}`}
                  src={round()?.question_data?.image_url ?? ''}
                  alt="Anime"
                />
              </Show>
              <div class="game-text-content">
                <div class="game-mode-badge">{round()?.mode ?? '…'}</div>
                <p class="game-question">
                  {round()?.mode === 'screenshot'
                    ? 'Quel animé est représenté sur cette image floutée ?'
                    : round()?.mode === 'portrait'
                      ? "Quel animé appartient à ce personnage ?"
                      : round()?.question_data?.hint ?? 'Chargement...'}
                </p>
              </div>
            </div>

            <Show when={feedback()}>
              <div class={`answer-feedback ${feedback().correct ? 'correct' : 'wrong'}`}>
                {feedback().msg}
              </div>
            </Show>

            <div class="answer-form">
              <input
                class="form-input answer-input"
                type="text"
                placeholder="Quel animé est-ce ?"
                autocomplete="off"
                value={answer()}
                onInput={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
              />
              <button class="btn btn-primary" onClick={() => submitAnswer()}>Répondre</button>
            </div>
            <div style="display:flex;gap:10px;margin-top:12px">
              <button class="btn btn-ghost btn-sm" onClick={() => submitAnswer(true)}>Passer ⏭</button>
              <button class="btn btn-ghost btn-sm" onClick={quitGame}>Quitter ✕</button>
            </div>
          </Show>

          {/* End screen */}
          <Show when={ended()}>
            <div class="end-screen">
              <div style="font-family:var(--font-display);font-size:18px;color:var(--text2)">Partie terminée !</div>
              <div class="end-score-big" style={{ color: scoreCol() }}>{score()}</div>
              <div class="end-rank-big"  style={{ color: scoreCol() }}>{rank()}</div>
              <div style="color:var(--text3);font-size:14px">
                {history().filter(h => h.correct).length} bonnes réponses sur {TOTAL_ROUNDS} —{' '}
                {Math.round(history().filter(h => h.correct).length / TOTAL_ROUNDS * 100)}% de précision
              </div>
              <div class="end-history">
                <For each={history()}>
                  {(h, i) => (
                    <div class="end-item" style={{ 'border-color': h.correct ? 'var(--teal)' : h.skipped ? 'var(--text3)' : 'var(--accent)' }}>
                      <div class="end-item-label">Round {i() + 1}</div>
                      <div class="end-item-pts" style={{ color: h.correct ? 'var(--teal)' : 'var(--text3)' }}>
                        {h.correct ? `+${h.points} pts` : h.skipped ? 'Passé' : '0 pts'}
                      </div>
                      <div style="font-size:11px;color:var(--text3);margin-top:2px">{h.correctAnswer}</div>
                    </div>
                  )}
                </For>
              </div>
              <div style="display:flex;gap:12px;justify-content:center;margin-top:8px">
                <button class="btn btn-primary" onClick={initGame}>Rejouer</button>
                <button class="btn btn-ghost"   onClick={() => navigate('/home')}>Accueil</button>
              </div>
            </div>
          </Show>

        </div>
      </div>
    </AppLayout>
  );
}
