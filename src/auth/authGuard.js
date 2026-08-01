import { getInstance } from ".";

const IS_LOCAL = window.location.hostname === 'localhost';

export const authGuard = (to, from, next) => {
  // Local dev: skip Auth0 entirely, use stubbed credentials matching the
  // local backend's LOCAL_DEV_USER so all GraphQL queries work.
  if (IS_LOCAL) {
    sessionStorage.setItem('sports-exchange.token', 'local-dev-token');
    sessionStorage.setItem('sports-exchange.email', 'exigentemail@gmail.com');
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
      const rolesList = authService.user['https://sports-exchange/roles'];
      const isAdmin = rolesList.includes('ADMIN');

      if(to.name !== 'Login' && !email) {
        console.log("got to login")
        next({ name: 'Login' });
      } else if (to.name === 'Admin' && !isAdmin) {
        console.log('go to home')
        next({ name: 'Home' });
      }
      console.log('go to next')
      return next();
    }

    // Otherwise, log in
    authService.loginWithRedirect({ appState: { targetUrl: to.fullPath } });
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
