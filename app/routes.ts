import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('library', 'routes/library.tsx'),
  route('perform/:id', 'routes/perform.$id.tsx')
] satisfies RouteConfig;
