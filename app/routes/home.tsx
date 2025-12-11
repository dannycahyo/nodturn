import { redirect } from 'react-router';

export function meta() {
  return [
    { title: 'NodTurn - Sheet Music Reader' },
    { name: 'description', content: 'Hands-free sheet music with head gestures' },
  ];
}

export async function loader() {
  return redirect('/library');
}
