import { createSignal } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { api } from '../api/client';
import { setSession } from '../store/auth';

export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab]       = createSignal('login');
  const [alert, setAlert]   = createSignal(null); // { msg, type }
  const [loading, setLoading] = createSignal(false);

  // Login fields
  const [loginInput, setLoginInput]       = createSignal('');
  const [loginPassword, setLoginPassword] = createSignal('');

  // Register fields
  const [regPseudo, setRegPseudo]       = createSignal('');
  const [regEmail, setRegEmail]         = createSignal('');
  const [regPassword, setRegPassword]   = createSignal('');
  const [regConfirm, setRegConfirm]     = createSignal('');

  async function doLogin() {
    if (!loginInput() || !loginPassword()) return setAlert({ msg: 'Remplis tous les champs.', type: 'error' });
    setLoading(true);
    try {
      const data = await api('POST', '/login', { login: loginInput(), password: loginPassword() });
      setSession(data.token, data.user);
      navigate('/home', { replace: true });
    } catch (e) {
      setAlert({ msg: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function doRegister() {
    if (!regPseudo() || !regEmail() || !regPassword()) return setAlert({ msg: 'Remplis tous les champs.', type: 'error' });
    if (regPassword() !== regConfirm()) return setAlert({ msg: 'Les mots de passe ne correspondent pas.', type: 'error' });
    setLoading(true);
    try {
      const data = await api('POST', '/register', {
        pseudo: regPseudo(), email: regEmail(),
        password: regPassword(), password_confirmation: regConfirm(),
      });
      setSession(data.token, data.user);
      navigate('/home', { replace: true });
    } catch (e) {
      setAlert({ msg: e.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">Anime<span>Guesser</span></div>

        <div class="auth-tabs">
          <button class={`auth-tab ${tab() === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setAlert(null); }}>Connexion</button>
          <button class={`auth-tab ${tab() === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setAlert(null); }}>Inscription</button>
        </div>

        {alert() && <div class={`alert alert-${alert().type}`}>{alert().msg}</div>}

        {tab() === 'login' ? (
          <div>
            <div class="form-group">
              <label class="form-label">Pseudo ou email</label>
              <input class="form-input" type="text" placeholder="naruto_fan" value={loginInput()} onInput={e => setLoginInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>
            <div class="form-group">
              <label class="form-label">Mot de passe</label>
              <input class="form-input" type="password" placeholder="••••••••" value={loginPassword()} onInput={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} />
            </div>
            <button class="btn btn-primary btn-full" onClick={doLogin} disabled={loading()}>
              {loading() ? <span class="spinner" /> : 'Se connecter'}
            </button>
          </div>
        ) : (
          <div>
            <div class="form-group">
              <label class="form-label">Pseudo</label>
              <input class="form-input" type="text" placeholder="naruto_fan" value={regPseudo()} onInput={e => setRegPseudo(e.target.value)} />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input class="form-input" type="email" placeholder="moi@exemple.com" value={regEmail()} onInput={e => setRegEmail(e.target.value)} />
            </div>
            <div class="form-group">
              <label class="form-label">Mot de passe</label>
              <input class="form-input" type="password" placeholder="••••••••" value={regPassword()} onInput={e => setRegPassword(e.target.value)} />
            </div>
            <div class="form-group">
              <label class="form-label">Confirmer</label>
              <input class="form-input" type="password" placeholder="••••••••" value={regConfirm()} onInput={e => setRegConfirm(e.target.value)} />
            </div>
            <button class="btn btn-primary btn-full" onClick={doRegister} disabled={loading()}>
              {loading() ? <span class="spinner" /> : 'Créer mon compte'}
            </button>
          </div>
        )}

        <p style="font-size:12px;color:var(--text3);text-align:center;margin-top:16px">
          Test: admin / Admin1234! · naruto_fan / Pass1234!
        </p>
      </div>
    </div>
  );
}
