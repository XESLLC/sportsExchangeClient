<template>
  <div v-if="isPageReady">
    <h2>Owners</h2>
    <div v-if="successMessage" class="alert-success text-center">
      {{successMessage}}
      <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
    </div>
    <md-table v-if="owners && owners.length" md-sort="email" md-sort-order="asc" v-model="owners">
      <md-table-row class="text-left" slot="md-table-row" slot-scope="{ item }">
        <md-table-cell md-label="Name" md-sort-by="firstname">{{ item.firstname }} {{ item.lastname }}</md-table-cell>
        <md-table-cell md-label="Email" md-sort-by="email">{{ item.email }}</md-table-cell>
        <md-table-cell md-label="Remove">
          <span :disabled="owners.length <= 1 || removeWait" @click="removeOwner(item)" :title="owners.length <= 1 ? 'An entry needs at least one owner' : 'Remove owner'">
            <md-icon :class="['fas fa-user-minus', owners.length <= 1 ? 'disabled-icon' : 'link']"></md-icon>
          </span>
        </md-table-cell>
      </md-table-row>
    </md-table>

    <div class="md-layout add-owner-row">
      <div class="md-layout-item md-large-size-50 md-medium-size-50 md-small-size-75 md-xsmall-size-100">
        <div class="field-label">Add Owner by Email</div>
        <md-field>
          <md-input v-model="newOwnerEmail" placeholder="jane@example.com" @keyup.enter.native="addOwner"></md-input>
        </md-field>
        <span class="hint">They need an existing account - ask them to sign up first if they don't have one.</span>
      </div>
      <div class="md-layout-item">
        <md-button :disabled="!newOwnerEmail || addWait" @click="addOwner" class="md-accent md-raised" :class="{ 'btn-disabled' : !newOwnerEmail || addWait }">
          Add Owner
          <md-progress-spinner v-if="addWait" class="btn-spin" :md-diameter="20" :md-stroke="3" md-mode="indeterminate"></md-progress-spinner>
        </md-button>
      </div>
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
  name: "EntryOwners",
  data() {
    return {
      isPageReady: false,
      owners: [],
      newOwnerEmail: '',
      addWait: false,
      removeWait: false,
      successMessage: null,
      serverError: null
    }
  },
  props: {
    entryId: {
      type: String
    }
  },
  methods: {
    async fetchOwners() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query UsersByEntryId($entryId: ID!) {
            usersByEntryId(entryId: $entryId) {
              id,
              firstname,
              lastname,
              email
            }
          }
        `,
        variables: {
          entryId: this.entryId
        }
      });

      this.owners = response.data.usersByEntryId;
    },
    async addOwner() {
      if(!this.newOwnerEmail) { return; }
      this.addWait = true;
      this.serverError = null;
      try {
        await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation AddEntryOwner($input: AddEntryOwnerInput!) {
              addEntryOwner(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: {
              entryId: this.entryId,
              email: this.newOwnerEmail.trim()
            }
          }
        });

        this.successMessage = `${this.newOwnerEmail.trim()} added as an owner - they'll see this entry next time they log in.`;
        this.newOwnerEmail = '';
        await this.fetchOwners();
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = "Server Error";
        }
      }
      this.addWait = false;
    },
    async removeOwner(owner) {
      if(this.owners.length <= 1 || this.removeWait) { return; }
      this.removeWait = true;
      this.serverError = null;
      try {
        await apolloClient.mutate({
          fetchPolicy: 'no-cache',
          mutation: gql`
            mutation RemoveEntryOwner($input: RemoveEntryOwnerInput!) {
              removeEntryOwner(input: $input) {
                id
              }
            }
          `,
          variables: {
            input: {
              entryId: this.entryId,
              userId: owner.id
            }
          }
        });

        this.successMessage = `${owner.email} removed as an owner.`;
        await this.fetchOwners();
      } catch(err) {
        if(err.graphQLErrors && err.graphQLErrors.length > 0) {
          this.serverError = err.graphQLErrors[0].message;
        } else {
          this.serverError = "Server Error";
        }
      }
      this.removeWait = false;
    }
  },
  watch: {
    async entryId(val) {
      if(val) {
        this.isPageReady = false;
        await this.fetchOwners();
        this.isPageReady = true;
      }
    }
  },
  async created() {
    await this.fetchOwners();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.add-owner-row {
  margin-top: 16px;
  align-items: flex-start;
}

.field-label {
  text-align: left;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.54);
}

.hint {
  display: block;
  margin-top: 8px;
  text-align: left;
}

.disabled-icon {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
