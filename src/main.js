import Vue from 'vue'
import Router from 'vue-router'
import App from './App.vue'
import ApolloClient from 'apollo-client'
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { setContext } from 'apollo-link-context';
import { ApolloLink } from "apollo-link";
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'
import "@/assets/global.css"
// import { onError } from "apollo-link-error";
import { domain, clientId, audience } from "../auth_config.json";
import { Auth0Plugin } from "./auth";
import { authGuard } from './auth/authGuard';

Vue.use(Router);
Vue.use(Auth0Plugin, {
  domain,
  clientId,
  audience,
  onRedirectCallback: (appState) => {
    router.push(
      appState && appState.targetUrl
        ? appState.targetUrl
        : window.location.pathname,
    );
  },
});

Vue.config.productionTip = false

import Login from './components/Login';
import Home from './components/Home';
import Admin from './components/Admin';
import Leagues from './components/Leagues';
import League from './components/League';
import Portfolio from './components/Portfolio';
import Transactions from './components/Transactions';
import Profile from './components/Profile';
import PortfolioSummary from './components/PortfolioSummary';
import PortfolioDetail from './components/PortfolioDetail';
import Tournament from './components/Tournament';
import Entry from './components/Entry';
import Exchanges from './components/Exchanges';
import EditEntryData from './components/EditEntryData';
import TournamentHome from './components/TournamentHome';
import ConfirmEmail from './components/ConfirmEmail';

const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login
    },
    {
      path: '/confirm-email/:token',
      name: 'ConfirmEmail',
      component: ConfirmEmail,
      props: true
    },
    {
      path: '/',
      name: 'Home',
      component: Home,
      beforeEnter: authGuard
    },
    {
      path: '/admin',
      name: 'Admin',
      component: Admin,
      beforeEnter: authGuard
    },
    {
      path: '/exchanges',
      name: 'Exchanges',
      component: Exchanges,
      beforeEnter: authGuard
    },
    {
      path: '/leagues',
      name: 'Leagues',
      component: Leagues,
      beforeEnter: authGuard
    },
    {
      path: '/league/:leagueId',
      name: 'League',
      component: League,
      props: true,
      beforeEnter: authGuard
    },
    {
      path: '/tournament/:leagueId/:tournamentId',
      name: 'Tournament',
      component: Tournament,
      props: true,
      beforeEnter: authGuard
    },
    {
      path: '/entry/:tournamentId/:entryId',
      name: 'Entry',
      component: Entry,
      props: true,
      beforeEnter: authGuard
    },
    {
      path: '/portfolio',
      name: 'Portfolio',
      component: Portfolio,
      props: true,
      beforeEnter: authGuard
    },
    {
      path: '/transactions',
      name: 'Transactions',
      component: Transactions,
      props: true,
      beforeEnter: authGuard
    },
    {
      path: '/profile',
      name: 'Profile',
      component: Profile,
      beforeEnter: authGuard
    },
    {
      path: '/portfolio-summary/:entryId',
      name: 'PortfolioSummary',
      component: PortfolioSummary,
      props: true,
      beforeEnter: authGuard
    },
    {
      path: '/portfolio-detail/:entryId',
      name: 'PortfolioDetail',
      component: PortfolioDetail,
      props: true,
      beforeEnter: authGuard
    },
    {
      path: '/edit-entry-data',
      name: 'EditEntryData',
      component: EditEntryData,
      props: true,
      beforeEnter: authGuard
    },
    {
      path: '/tournament-home/:tournamentId',
      name: 'TournamentHome',
      component: TournamentHome,
      props: true,
      beforeEnter: authGuard
    }
  ]
});

const IS_LOCAL = window.location.hostname === 'localhost';
const API_URL = IS_LOCAL
  ? 'http://localhost:4000/graphql'
  : 'https://guyaafzm5l.execute-api.us-west-2.amazonaws.com/dev/graphql';

const httpLink = createHttpLink({ uri: API_URL });
const middlewareLink = setContext(async () => {
  const token = sessionStorage.getItem('sports-exchange.token')
  return {
    headers: {
      authorization: token
    }
  }
});

const links = ApolloLink.from([middlewareLink, httpLink]);

export const apolloClient = new ApolloClient({
  link: links,
  cache: new InMemoryCache()
});

Vue.filter('toCurrency', function (value) {
  if(typeof value !== "number") {
    return value;
  }
  var formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
  });
  const formattedValue = formatter.format(value);
  if(formattedValue.substr(0, 1) === '-'){
    return `(${formattedValue.substring(1, formattedValue.length)})`;
  }
  return formattedValue;
});

new Vue({
  router,
  render: h => h(App),
}).$mount('#app');
