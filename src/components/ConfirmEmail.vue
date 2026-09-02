<template>
  <div class="confirm-email-page">
    <md-card>
      <md-card-content>
        <md-progress-spinner v-if="isConfirming" class="spinner-primary" md-mode="indeterminate"></md-progress-spinner>
        <div v-else-if="confirmed" class="text-center">
          <h2>Email confirmed!</h2>
          <p>Thanks for confirming - you're all set to receive notifications.</p>
          <span class="link decorated-link" @click="$router.push({ name: 'Profile' })">Back to Profile</span>
        </div>
        <div v-else class="text-center">
          <h2>Link invalid</h2>
          <p>This confirmation link is invalid or has already been used.</p>
          <span class="link decorated-link" @click="$router.push({ name: 'Profile' })">Back to Profile</span>
        </div>
      </md-card-content>
    </md-card>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "ConfirmEmail",
  data() {
    return {
      isConfirming: true,
      confirmed: false
    }
  },
  props: {
    token: {
      type: String
    }
  },
  async created() {
    if (!sessionStorage.getItem('sports-exchange.token')) {
      sessionStorage.setItem('sports-exchange.postLoginRedirect', this.$route.fullPath);
      this.$router.push({ name: 'Login' });
      return;
    }
    try {
      await apolloClient.mutate({
        mutation: gql`
          mutation ConfirmEmail($token: String!) {
            confirmEmail(token: $token) {
              id,
              emailConfirmedAt
            }
          }
        `,
        variables: {
          token: this.token
        }
      });

      this.confirmed = true;
    } catch(err) {
      this.confirmed = false;
    }
    this.isConfirming = false;
  }
}
</script>

<style scoped>
.confirm-email-page {
  padding-top: 64px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}
</style>
