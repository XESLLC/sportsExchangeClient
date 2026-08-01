<template>
  <div>
    <div class="md-layout">
      <div class="md-layout-item"></div>
      <md-field class="md-layout-item md-large-size-50 md-medium-size-50 md-small-size-75 md-xsmall-size-100">
        <label>Entry Team Name</label>
        <md-input v-model="createEntryInput.name"></md-input>
        <span v-if="inputError === 'name'" class="error form-error">Please enter an entry name</span>
      </md-field>
      <md-field class="md-layout-item md-large-size-50 md-medium-size-50 md-small-size-75 md-xsmall-size-100">
        <label>Additional Owner Emails (optional, comma separated)</label>
        <md-input v-model="additionalOwnerEmailsInput" placeholder="jane@example.com, sam@example.com"></md-input>
        <span class="hint">Each address must already have an account - they'll see this entry next time they log in.</span>
      </md-field>
    </div>
    <div class="md-layout">
      <div class="md-layout-item"></div>
        <md-button :disabled="httpWait" @click="createEntry()" class="md-raised md-primary" :class="{ 'btn-disabled' : httpWait }">
          Submit
          <md-progress-spinner v-if="httpWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
        </md-button>
      <div class="md-layout-item"></div>
    </div>
    <div v-if="serverError" class="alert-error text-center">
      {{serverError}}
      <span @click="serverError = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "TeamForm",
  data() {
    return {
      createEntryInput: {},
      additionalOwnerEmailsInput: '',
      inputError: null,
      serverError: null,
      httpWait: false
    }
  },
  props: {
    formType: {
      type: String
    },
    successCb: {
      type: Function
    },
    tournamentId: {
      type: String
    }
  },
  methods: {
    async createEntry() {
      this.httpWait = true;
      try {
        const additionalOwnerEmails = this.additionalOwnerEmailsInput
          .split(',')
          .map(email => email.trim())
          .filter(email => email.length > 0);
        const ownerEmail = sessionStorage.getItem('sports-exchange.email');
        // De-dupe in case the creator re-typed their own email into the additional-owners field
        this.createEntryInput.userEmails = [...new Set([ownerEmail, ...additionalOwnerEmails])];
        this.createEntryInput.tournamentId = this.tournamentId;
        const response = await apolloClient.mutate({
          mutation: gql`
            mutation CreateEntry($input: EntryInput!) {
              createEntry(input: $input) {
                id,
                name
              }
            }
          `,
          variables: {
            input: this.createEntryInput
          }
        });

        const entry = response.data.createEntry;
        this.successCb(entry.id);
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = "Server Error";
        }
        this.httpWait = false;
        return err;
      }
    }
  },
  async created() {
  }
}
</script>

<style scoped>
</style>