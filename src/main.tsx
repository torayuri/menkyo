import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Categories from './pages/Categories';
import History from './pages/History';
import Home from './pages/Home';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import { DialogHost, useRoute } from './ui';
import './styles.css';

function App() {
  const [page, arg] = useRoute();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, arg]);

  let view;
  if (page === 'quiz') view = <Quiz />;
  else if (page === 'categories') view = <Categories />;
  else if (page === 'history') view = <History />;
  else if (page === 'result' && arg) view = <Result key={arg} id={arg} />;
  else view = <Home />;

  return (
    <>
      <div className="app" key={page}>
        {view}
      </div>
      <DialogHost />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
