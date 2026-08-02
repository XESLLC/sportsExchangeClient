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
      isAdmin: false,
      userEntries: null
    }
  },
  watch: {},
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
    this.isAdmin = sessionStorage.getItem('sports-exchange.isAdmin') === 'true';
    await this.determineRouteRedirect();
  }
}
</script>

<style scoped>
</style>
