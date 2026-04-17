import Sidebar from './Sidebar';

export default function AppLayout(props) {
  return (
    <div class="app-shell">
      <Sidebar />
      <main class="main-content">
        {props.children}
      </main>
    </div>
  );
}
