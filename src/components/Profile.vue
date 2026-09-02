<template>
  <div v-if="isPageReady" class="content-container">
    <md-card>
      <div v-if="successMessage" class="alert-success">
        {{successMessage}}
        <span @click="successMessage = null"><md-icon class="fa fa-times-circle light link"></md-icon></span>
      </div>
      <md-card-header>
        <div class="md-title">Profile</div>
      </md-card-header>

      <md-card-content>
        <div class="profile-info">
          <div v-if="!isEditingMode">Name: {{user.firstname}} {{user.lastname}}</div>
          <div v-else>
            <div>First Name: <input v-model="userInput.firstname" /></div>
            <div>Last Name: <input v-model="userInput.lastname" /></div>
          </div>
          <div v-if="!isEditingMode">Email: {{user.email}}</div>
          <div>Phone Number: <span v-if="!isEditingMode">{{user.phoneNumber}}</span> <input v-else v-model="userInput.phoneNumber" /></div>
          <div>Username: <span v-if="!isEditingMode">{{user.username}}</span> <input v-else v-model="userInput.username" /></div>
          <div v-if="!isEditingMode">Password: {{placeholderPassword}}</div>
          <!-- <div>Balance: {{user.cash | toCurrency}}</div> -->
          <div v-if="!isEditingMode">Entries/Exchanges:
            <span v-for="(entry, index) in userEntries" :key="entry.id" class="link decorated-link" @click="goToPortfolio(entry)">{{entry.name}}<span v-if="userEntries.length > 1 && index !== userEntries.length -1" class="no-link">, </span></span>
          </div>
          <div class="notification-pref">
            <md-switch v-model="userInput.notifyOnMessageBoard" @change="saveNotificationPref" class="md-primary">
              Email me when a new message board thread is posted
            </md-switch>
          </div>
          <div class="email-confirmation">
            <span v-if="user.emailConfirmedAt">✓ Email confirmed on {{ formatDate(user.emailConfirmedAt) }}</span>
            <span v-else>
              ⚠ Email not yet confirmed
              <md-button :disabled="confirmationSending" class="md-primary confirmation-btn" @click="sendConfirmationEmail">Send Confirmation Email</md-button>
            </span>
            <div v-if="confirmationMessage" class="confirmation-message">{{ confirmationMessage }}</div>
          </div>
        </div>
      </md-card-content>

      <md-card-actions>
        <md-button v-if="!isEditingMode" class="md-primary" @click="isEditingMode = true">Edit</md-button>
        <div v-else>
          <md-button class="md-accent" @click="isEditingMode = false">Cancel</md-button>
          <md-button class="md-primary" @click="saveProfileChanges">Save</md-button>
        </div>
      </md-card-actions>
    </md-card>
  </div>
</template>

<script>
import { apolloClient } from "../main";
import gql from 'graphql-tag';

export default {
  name: "Profile",
  data() {
    return {
      isPageReady: false,
      user: null,
      placeholderPassword: "************",
      email: sessionStorage.getItem('sports-exchange.email'),
      isEditingMode: false,
      userInput: {},
      successMessage: null,
      userEntries: null,
      confirmationSending: false,
      confirmationMessage: null
    }
  },
  methods: {
    async fetchUserInfo() {
      const response = await apolloClient.query({
        query: gql`
          query User($email: String!) {
            user(email: $email) {
              id,
              firstname,
              lastname,
              email,
              cash,
              username,
              phoneNumber,
              notifyOnMessageBoard,
              emailConfirmedAt
            }
          }
        `,
        variables: {
          email: this.email
        }
      });

      this.user = response.data.user;
      this.userInput.email = this.user.email;
      this.userInput.firstname = this.user.firstname;
      this.userInput.lastname = this.user.lastname;
      this.userInput.phoneNumber = this.user.phoneNumber;
      this.userInput.username = this.user.username;
      this.userInput.notifyOnMessageBoard = !!this.user.notifyOnMessageBoard;
    },
    async fetchUserEntries() {
      const response = await apolloClient.query({
        fetchPolicy: 'no-cache',
        query: gql`
          query UserEntries($email: String!) {
            userEntries(email: $email) {
              id,
              name,
              tournamentId,
              tournament {
                status,
                masterSheetUpload,
                pricingSheetUpload,
                rulesSheetUpload,
                projectedPayoutSheetUpload,
                stockPayoutSheetUpload
              }
            }
          }
        `,
        variables: {
          email: this.email
        }
      });

      this.userEntries = response.data.userEntries;
      this.userEntries = this.userEntries.filter(entry => entry.tournament.status !== 'inactive');
    },
    goToPortfolio(entry) {
      this.$router.push({ 
        name: "Portfolio",
        params: {
          entryId: entry.id
        }
      });
    },
    async saveProfileChanges() {
      await this.updateUser();
      this.isEditingMode = false;
      this.successMessage = "Successfully updated user profile!";
    },
    async saveNotificationPref() {
      await this.updateUser();
    },
    // async triggerResetPassword() {
    //   // TODO check if this is successful in deployed app
    //   const data = {
    //     data: {
    //       client_id: clientId,
    //       email: this.email,
    //       connection: 'Username-Password-Authentication'
    //     }
    //   }
    //   await fetch("https://dev-8duzx03a.us.auth0.com/dbconnections/change_password", {
    //     method: 'POST',
    //     mode: 'cors',
    //     cache: 'no-cache',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(data)
    //   });
    // },
    async updateUser() {
      const response = await apolloClient.mutate({
        mutation: gql`
          mutation UpdateUser($userInput: UserInput!) {
            updateUser(input: $userInput) {
              id,
              firstname,
              lastname,
              email,
              cash,
              username,
              phoneNumber,
              notifyOnMessageBoard,
              emailConfirmedAt
            }
          }
        `,
        variables: {
          userInput: this.userInput
        }
      });

      this.user = response.data.updateUser;
      this.userInput.email = this.user.email;
      this.userInput.firstname = this.user.firstname;
      this.userInput.lastname = this.user.lastname;
      this.userInput.phoneNumber = this.user.phoneNumber;
      this.userInput.username = this.user.username;
      this.userInput.notifyOnMessageBoard = !!this.user.notifyOnMessageBoard;
    },
    formatDate(dateString) {
      return new Date(parseInt(dateString) || dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    async sendConfirmationEmail() {
      this.confirmationSending = true;
      this.confirmationMessage = null;
      try {
        const response = await apolloClient.mutate({
          mutation: gql`
            mutation SendEmailConfirmation($email: String!) {
              sendEmailConfirmation(email: $email)
            }
          `,
          variables: {
            email: this.user.email
          }
        });

        this.confirmationMessage = response.data.sendEmailConfirmation
          ? "Confirmation email sent! Check your inbox (and spam folder)."
          : "Could not send the confirmation email - please try again in a moment.";
      } catch(err) {
        this.confirmationMessage = "Could not send the confirmation email - please try again in a moment.";
      }
      this.confirmationSending = false;
    },
  },
  async created() {
    await this.fetchUserInfo();
    await this.fetchUserEntries();
    this.isPageReady = true;
  }
}
</script>

<style scoped>
.content-container {
  padding-top: 64px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.link {
  cursor: pointer;
  color: blue;
}

.no-link {
  cursor: default;
  color: black;
}

.notification-pref {
  margin-top: 12px;
}

.email-confirmation {
  margin-top: 12px;
}

.confirmation-btn {
  margin-left: 8px;
}

.confirmation-message {
  margin-top: 8px;
  font-size: 0.9em;
}

@media screen and (max-width: 820px){
  .content-container {
    max-width: 80vw;
  }
}
</style>