<template>
  <div>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "Home",
  data() {
    return {
      auth: null,
      isAdmin: false,
      userEntries: null
    }
  },
  watch: {
    async auth(val) {
      if(val && !val.loading) {
        const rolesList = this.$auth.user['https://sports-exchange/roles'];
        this.isAdmin = rolesList.includes('ADMIN');
        await this.determineRouteRedirect();
      }
    }
  },
  methods: {
    async determineRouteRedirect() {
      if(this.isAdmin) {
        this.$router.push({ name: "Admin" });
      } else {
        await this.fetchUserEntries();
        // if(this.userEntries && this.userEntries.length > 0) {
        //   this.$router.push({
        //     name: "Portfolio",
        //     params: {
        //       entryId: this.userEntries[0].id
        //     }
        //   });
        // } else {
          this.$router.push({ name: "Exchanges" });
        // }
      }
    },
    async fetchUserEntries() {
      const email = sessionStorage.getItem('sports-exchange.email');
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query UserEntries($email: String!) {
            userEntries(email: $email) {
              id,
              name,
              tournamentId
            }
          }
        `,
        variables: {
          email
        }
      });

      this.userEntries = response.data.userEntries;
    }
  },
  async created() {
    this.auth = this.$auth;
  }
}
</script>

<style scoped>
</style>
