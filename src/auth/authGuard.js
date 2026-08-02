import { getInstance } from ".";

const IS_LOCAL = window.location.hostname === 'localhost';

export const authGuard = (to, from, next) => {
  // Local dev: skip Auth0 entirely, use stubbed credentials matching the
  // local backend's LOCAL_DEV_USER so all GraphQL queries work.
  if (IS_LOCAL) {
    sessionStorage.setItem('sports-exchange.token', 'local-dev-token');
    sessionStorage.setItem('sports-exchange.email', 'exigentemail@gmail.com');
    sessionStorage.setItem('sports-exchange.isAdmin', 'false');
    return next();
  }

  const authService = getInstance();

  const fn = async() => {
    // If the user is authenticated, continue with the route
    if(authService.isAuthenticated) {
      console.log('authenticated')
      const tokenInfo = await authService.getIdTokenClaims();
      const token = tokenInfo.__raw;
      sessionStorage.setItem('sports-exchange.token', token);
      const email = sessionStorage.getItem('sports-exchange.email');
      const isAdmin = sessionStorage.getItem('sports-exchange.isAdmin') === 'true';

      if(to.name !== 'Login' && !email) {
        next({ name: 'Login' });
      } else if (to.name === 'Admin' && !isAdmin) {
        next({ name: 'Home' });
      } else {
        return next();
      }
    }

    // Otherwise, send to login page
    next({ name: 'Login' });
  };

  // If loading has already finished, check the auth state using `fn()`
  if (!authService.loading) {
    return fn();
  }

  // Watch for the loading property to change before checking isAuthenticated
  authService.$watch("loading", loading => {
    if (loading === false) {
      return fn();
    }
  });
};
