<template>
  <div v-if="isPageReady">
    <md-app md-mode="fixed">
      <md-app-toolbar class="nav-bar">
        <div class="md-toolbar-row">
          <div class="md-toolbar-section-start">
            <img class="brand-img link" @click="goToRoute('Home')" src="https://fsse-public-assets.s3.us-west-2.amazonaws.com/LOGO+4+FSSE+(2).svg" />
          </div>
          <div class="md-toolbar-section-end">
            <div class="md-medium-hide">
              <md-button v-if="isAdmin" :class="{'link-selected' : currentRoute === 'Admin'}" class="menu-item" @click="goToRoute('Admin')">Admin</md-button>
              <md-button :class="{'link-selected' : currentRoute === 'Exchanges'}" class="menu-item" @click="goToRoute('Exchanges')">Exchanges</md-button>
              <md-button :class="{'link-selected' : currentRoute === 'Portfolio'}" class="menu-item" @click="goToRoute('Portfolio')">Portfolio</md-button>
              <md-button :class="{'link-selected' : currentRoute === 'Transactions'}" class="menu-item" @click="goToRoute('Transactions')">IPO/Offers</md-button>
              <md-button :class="{'link-selected' : currentRoute === 'Profile'}" class="menu-item" @click="goToRoute('Profile')">Profile</md-button>
              <md-button @click="logOut()" class="menu-item">Log Out</md-button>
            </div>
            <md-button class="md-icon-button" @click="sideMenuVisible = !sideMenuVisible">
              <md-icon>menu</md-icon>
            </md-button>
          </div>
        </div>
      </md-app-toolbar>
      <md-app-drawer class="app-drawer-primary" md-right :md-active.sync="sideMenuVisible">
        <md-toolbar class="md-transparent" md-elevation="0"></md-toolbar>

        <md-list class="app-drawer-list-primary">
          <md-list-item v-if="isAdmin" class="link">
            <md-icon class="fas fa-user-shield" :class="{'link-selected' : currentRoute === 'Admin'}"></md-icon>
            <span class="md-list-item-text menu-item" :class="{'link-selected' : currentRoute === 'Admin'}" @click="goToRoute('Admin')">Admin</span>
          </md-list-item>

          <md-list-item class="link">
            <md-icon class="fas fa-trophy" :class="{'link-selected' : currentRoute === 'Exchanges'}"></md-icon>
            <span class="md-list-item-text menu-item" :class="{'link-selected' : currentRoute === 'Exchanges'}" @click="goToRoute('Exchanges')">Exchanges</span>
          </md-list-item>

          <md-list-item class="link">
            <md-icon class="fas fa-folder-open" :class="{'link-selected' : currentRoute === 'Portfolio'}"></md-icon>
            <span class="md-list-item-text menu-item" :class="{'link-selected' : currentRoute === 'Portfolio'}" @click="goToRoute('Portfolio')">Portfolio</span>
          </md-list-item>

          <md-list-item class="link">
            <md-icon class="fas fa-layer-group" :class="{'link-selected' : currentRoute === 'Transactions'}"></md-icon>
            <span class="md-list-item-text menu-item" :class="{'link-selected' : currentRoute === 'Transactions'}" @click="goToRoute('Transactions')">IPO/Offers</span>
          </md-list-item>

          <md-list-item class="link">
            <md-icon class="fas fa-user" :class="{'link-selected' : currentRoute === 'Profile'}"></md-icon>
            <span class="md-list-item-text menu-item" :class="{'link-selected' : currentRoute === 'Profile'}" @click="goToRoute('Profile')">Profile</span>
          </md-list-item>

          <md-list-item class="link">
            <md-icon class="fas fa-sign-out-alt"></md-icon>
            <span class="md-list-item-text menu-item" @click="logOut()">Log Out</span>
          </md-list-item>
        </md-list>
      </md-app-drawer>

      <md-app-content id="app">
        <router-view></router-view>
      </md-app-content>
    </md-app>
  </div>
</template>

<script>
export default {
  name: "NavBar",
  data() {
    return {
      isAdmin: false,
      isPageReady: false,
      sideMenuVisible: false
    }
  },
  computed: {
    currentRoute() {
      return this.$route.name;
    }
  },
  watch: {
    async auth(val) {
      if(val && !val.loading) {
        const user = this.$auth.user;
        const rolesList = (user && user['https://sports-exchange/roles']) || [];
        this.isAdmin = rolesList.includes('ADMIN');
        await this.determineRouteRedirect();
      }
    }
  },
  methods: {
    goToRoute(routeName) {
      if(this.$route.name !== routeName) {
        this.$router.push({ name: routeName });
      }
      this.sideMenuVisible = false;
    },
    logOut() {
      sessionStorage.clear();
      if(this.$auth && !this.$auth.loading && this.$auth.isAuthenticated) {
        this.$auth.logout({
          returnTo: window.location.origin
        });
      }
    }
  },
  async created() {
    if(this.$auth) {
      setTimeout(() => {
        const user = this.$auth.user;
        const rolesList = (user && user['https://sports-exchange/roles']) || [];
        this.isAdmin = rolesList.includes('ADMIN');
        this.isPageReady = true;
      }, 100);
    }
  }
}
</script>

<style scoped>
#app {
  font-family: 'Titillium Web', sans-serif;;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  min-height: 100vh;
  background-color: #F5F5F5;
}

.brand-img {
  height: 50px;
}

.nav-bar {
  background-color: #487233 !important;
}

.link-selected {
  color: #24E22C !important;
}

.menu-item {
  font-weight: bold;
}

.md-icon-button {
  display: none;
}

.app-drawer-primary {
  background-color: #487233 !important;
}

.app-drawer-list-primary {
  background-color: #487233 !important;
}

.md-drawer {
  max-width: 280px;
}

@media screen and (max-width: 1280px){
  .md-icon-button {
    display: block;
  }
}
</style>
