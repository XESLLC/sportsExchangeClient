<template>
  <div class="login-page">
    <div class="login-card">
      <img class="login-logo" src="https://fsse-public-assets.s3.us-west-2.amazonaws.com/LOGO+4+FSSE+(2).svg" />
      <h2 class="login-title">Fantasy Sports Stock Exchange</h2>

      <div v-if="loading" class="login-loading">
        <md-progress-spinner class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
        <p class="cancel-hint">Waiting to log in...</p>
        <md-button class="cancel-btn" @click="loading = false">Cancel</md-button>
      </div>
      <div v-else>
        <md-button class="md-raised login-btn" @click="handleLogin">Log In</md-button>
      </div>
    </div>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "Login",
  data() {
    return {
      loading: true,
      userInput: null
    }
  },
  methods: {
    async handleLogin() {
      this.loading = true;
      try {
        await this.$auth.loginWithPopup();
      } catch (err) {
        // Popup closed or cancelled by user
        this.loading = false;
        return;
      }
      if (this.$auth.isAuthenticated) {
        await this.completeLogin();
      } else {
        this.loading = false;
      }
    },
    async createUser() {
      try {
        const response = await apolloClient.mutate({
          mutation: gql`
            mutation CreateUser($userInput: UserInput!) {
              createUser(input: $userInput) {
                id,
                firstname,
                lastname,
                email,
                isAdmin,
                emailConfirmedAt
              }
            }
          `,
          variables: {
            userInput: this.userInput
          }
        });
        const user = response.data.createUser;
        sessionStorage.setItem('sports-exchange.email', user.email);
        sessionStorage.setItem('sports-exchange.isAdmin', user.isAdmin ? 'true' : 'false');
        sessionStorage.setItem('sports-exchange.emailConfirmed', user.emailConfirmedAt ? 'true' : 'false');
      } catch (err) {
        // Fetch user to get isAdmin
        try {
          const userResp = await apolloClient.query({
            fetchPolicy: 'no-cache',
            query: gql`
              query User($email: String!) {
                user(email: $email) { email, isAdmin, emailConfirmedAt }
              }
            `,
            variables: { email: this.userInput.email }
          });
          const user = userResp.data.user;
          sessionStorage.setItem('sports-exchange.email', user.email);
          sessionStorage.setItem('sports-exchange.isAdmin', user.isAdmin ? 'true' : 'false');
          sessionStorage.setItem('sports-exchange.emailConfirmed', user.emailConfirmedAt ? 'true' : 'false');
        } catch {
          sessionStorage.setItem('sports-exchange.email', this.userInput.email);
          sessionStorage.setItem('sports-exchange.isAdmin', 'false');
          sessionStorage.setItem('sports-exchange.emailConfirmed', 'false');
        }
      }
      this.$root.$emit('sports-exchange-auth-updated');

      const postLoginRedirect = sessionStorage.getItem('sports-exchange.postLoginRedirect');
      if (postLoginRedirect) {
        sessionStorage.removeItem('sports-exchange.postLoginRedirect');
        this.$router.push(postLoginRedirect);
      } else {
        this.$router.push({ name: "Home" });
      }
    },
    async completeLogin() {
      const tokenInfo = await this.$auth.getIdTokenClaims();
      sessionStorage.setItem('sports-exchange.token', tokenInfo.__raw);

      const email = this.$auth.user.email;
      const username = this.$auth.user.nickname;
      const firstname = this.$auth.user['https://sports-exchange/firstname'] || 'exchange';
      const lastname = this.$auth.user['https://sports-exchange/lastname'] || 'user';
      const phoneNumber = this.$auth.user['https://sports-exchange/phone'];

      this.userInput = { firstname, lastname, cash: 0, email, username, phoneNumber };
      await this.createUser();
    }
  },
  async created() {
    // Wait for Auth0 to finish loading
    if (this.$auth.loading) {
      await new Promise(resolve => {
        this.$auth.$watch('loading', loading => {
          if (!loading) resolve();
        });
      });
    }

    if (this.$auth.isAuthenticated) {
      await this.completeLogin();
    } else {
      this.loading = false;
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background-color: #487233;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  background: white;
  border-radius: 8px;
  padding: 48px 40px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 4px 24px rgba(0,0,0,0.18);
}

.login-logo {
  height: 80px;
  margin-bottom: 16px;
}

.login-title {
  color: #487233;
  font-size: 1.2em;
  font-weight: bold;
  margin: 0 0 32px;
}

.login-loading {
  padding: 16px 0;
}

.login-btn {
  background-color: #487233 !important;
  color: white !important;
  font-weight: bold;
  font-size: 1em;
  padding: 0 32px;
  height: 44px;
}

.cancel-hint {
  color: #888;
  font-size: 0.85em;
  margin: 12px 0 4px;
}

.cancel-btn {
  color: #487233 !important;
  font-size: 0.9em;
}
</style>
