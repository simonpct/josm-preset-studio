import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { AppShell } from './components/AppShell';
import { HomeRoute } from './routes/Home';
import { EditorRoute } from './routes/Editor';
import { CallbackRoute } from './routes/Callback';
import { SharedByHashRoute, SharedByIdRoute } from './routes/SharedView';

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/', element: <HomeRoute /> },
      { path: '/editor', element: <EditorRoute /> },
      { path: '/p/:id/edit', element: <EditorRoute /> },
      { path: '/p/:id', element: <SharedByIdRoute /> },
      { path: '/p', element: <SharedByHashRoute /> },
      { path: '/callback', element: <CallbackRoute /> },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
