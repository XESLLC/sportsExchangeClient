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
        <div class="table-wrapper">
          <table class="profile-table">
            <tbody>
              <tr>
                <td class="field-label">Name</td>
                <td>
                  <template v-if="!isEditingMode">{{user.firstname}} {{user.lastname}}</template>
                  <template v-else>
                    <input class="profile-input" v-model="userInput.firstname" placeholder="First Name" />
                    <input class="profile-input" v-model="userInput.lastname" placeholder="Last Name" />
                  </template>
                </td>
                <td class="action-cell">
                  <md-icon v-if="!isEditingMode" class="edit-icon" @click.native="isEditingMode = true">edit</md-icon>
                </td>
              </tr>
              <tr>
                <td class="field-label">Email</td>
                <td>
                  <div>{{user.email}}</div>
                  <div class="email-confirmation">
                    <span v-if="user.emailConfirmedAt" class="confirmed">✓ Confirmed on {{ formatDate(user.emailConfirmedAt) }}</span>
                    <span v-else class="unconfirmed">
                      ⚠ Not yet confirmed
                      <md-button :disabled="confirmationSending" class="md-primary confirmation-btn" @click="sendConfirmationEmail">Send Confirmation Email</md-button>
                    </span>
                    <div v-if="confirmationMessage" class="confirmation-message">{{ confirmationMessage }}</div>
                  </div>
                </td>
                <td class="action-cell"></td>
              </tr>
              <tr>
                <td class="field-label">Phone Number</td>
                <td>
                  <template v-if="!isEditingMode">{{user.phoneNumber}}</template>
                  <input v-else class="profile-input" v-model="userInput.phoneNumber" />
                </td>
                <td class="action-cell">
                  <md-icon v-if="!isEditingMode" class="edit-icon" @click.native="isEditingMode = true">edit</md-icon>
                </td>
              </tr>
              <tr>
                <td class="field-label">Username</td>
                <td>
                  <template v-if="!isEditingMode">{{user.username}}</template>
                  <input v-else class="profile-input" v-model="userInput.username" />
                </td>
                <td class="action-cell">
                  <md-icon v-if="!isEditingMode" class="edit-icon" @click.native="isEditingMode = true">edit</md-icon>
                </td>
              </tr>
              <tr>
                <td class="field-label">Password</td>
                <td>{{placeholderPassword}}</td>
                <td class="action-cell"></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="notification-pref">
          <md-switch v-model="userInput.notifyOnMessageBoard" @change="saveNotificationPref" class="md-primary">
            Email me when a new message board thread is posted
          </md-switch>
        </div>

        <div v-if="userEntries && userEntries.length" class="entries-section">
          <h3 class="entries-title">Entries/Exchanges</h3>
          <div class="entries-grid">
            <div v-for="entry in userEntries" :key="entry.id" class="entry-card" @click="goToPortfolio(entry)">
              <div class="entry-card-name">{{entry.name}}</div>
              <div v-if="entry.tournament && entry.tournament.name" class="entry-card-tournament">{{entry.tournament.name}}</div>
            </div>
          </div>
        </div>
      </md-card-content>

      <md-card-actions v-if="isEditingMode">
        <md-button class="md-accent" @click="isEditingMode = false">Cancel</md-button>
        <md-button class="md-primary" @click="saveProfileChanges">Save</md-button>
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
                name,
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

.table-wrapper {
  overflow: auto;
  border: 1px solid rgba(0, 0, 0, .12);
  border-radius: 4px;
}

.profile-table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  font-size: 14px;
}

.profile-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, .12);
  vertical-align: middle;
}

.profile-table tr:last-child td {
  border-bottom: none;
}

.profile-table tr:hover td {
  background: #f9f9f9;
}

.field-label {
  font-weight: 600;
  width: 160px;
  white-space: nowrap;
  color: #474C45;
}

.action-cell {
  width: 40px;
  text-align: right;
}

.edit-icon {
  cursor: pointer;
  color: #8e9889 !important;
  font-size: 20px !important;
}

.edit-icon:hover {
  color: #474C45 !important;
}

.profile-input {
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 3px;
  margin-right: 8px;
  font-family: inherit;
  font-size: 14px;
}

.notification-pref {
  margin-top: 20px;
}

.email-confirmation {
  margin-top: 6px;
  font-size: 0.85em;
}

.confirmed {
  color: #17bd22;
}

.unconfirmed {
  color: #b8860b;
}

.confirmation-btn {
  margin-left: 8px;
}

.confirmation-message {
  margin-top: 8px;
  font-size: 0.9em;
}

.entries-section {
  margin-top: 24px;
}

.entries-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 10px;
  color: #474C45;
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.entry-card {
  padding: 10px 14px;
  background: #eef4ec;
  border-left: 4px solid #24E22C;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
}

.entry-card:hover {
  background: #e2ede0;
}

.entry-card-name {
  font-weight: 500;
}

.entry-card-tournament {
  font-size: 0.85em;
  color: #666;
  margin-top: 2px;
}

@media screen and (max-width: 820px){
  .content-container {
    max-width: 80vw;
  }

  .field-label {
    width: auto;
  }
}
</style>