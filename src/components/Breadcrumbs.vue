<template>
  <nav v-if="crumbs && crumbs.length" class="breadcrumbs" aria-label="Breadcrumb">
    <template v-for="(crumb, index) in crumbs">
      <router-link v-if="crumb.to" :key="'link-' + index" :to="crumb.to" class="breadcrumb-link">{{ crumb.label }}</router-link>
      <span v-else :key="'text-' + index" class="breadcrumb-current">{{ crumb.label }}</span>
      <span v-if="index < crumbs.length - 1" :key="'sep-' + index" class="breadcrumb-separator">/</span>
    </template>
  </nav>
</template>

<script>
export default {
  name: "Breadcrumbs",
  props: {
    // Ordered list of { label, to }. Omit `to` (or pass null) for a crumb
    // that shouldn't be a link - e.g. the current page, or a step that
    // doesn't have a page of its own to link to.
    crumbs: {
      type: Array,
      required: true
    }
  }
}
</script>

<style scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 0.85em;
  color: #666;
  margin-bottom: 12px;
  text-align: left;
}

.breadcrumb-link {
  color: #487233;
  text-decoration: none;
}

.breadcrumb-link:hover {
  text-decoration: underline;
}

.breadcrumb-current {
  color: #333;
  font-weight: 600;
}

.breadcrumb-separator {
  color: #999;
}
</style>
