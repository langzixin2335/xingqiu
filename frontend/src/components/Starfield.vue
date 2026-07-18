<template>
  <div ref="container" class="starfield" />
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  starCount: { type: Number, default: 80 },
  shootingStars: { type: Number, default: 0 },
  variableStars: { type: Boolean, default: false },
})

const container = ref(null)

onMounted(() => {
  const el = container.value
  if (!el) return

  for (let i = 0; i < props.starCount; i++) {
    const star = document.createElement('div')
    star.className = 'star'
    star.style.left = `${Math.random() * 100}%`
    star.style.top = `${Math.random() * 100}%`
    star.style.setProperty('--duration', `${(Math.random() * 3 + 2)}s`)
    star.style.setProperty('--delay', `${Math.random() * 5}s`)
    star.style.setProperty('--opacity', `${Math.random() * 0.8 + 0.2}`)
    if (props.variableStars) {
      const size = 1 + Math.random() * 2
      star.style.width = `${size}px`
      star.style.height = `${size}px`
    }
    el.appendChild(star)
  }

  for (let i = 0; i < props.shootingStars; i++) {
    const shootingStar = document.createElement('div')
    shootingStar.className = 'shooting-star'
    shootingStar.style.left = `${Math.random() * 50}%`
    shootingStar.style.top = `${Math.random() * 30}%`
    shootingStar.style.setProperty('--delay', `${i * 5 + Math.random() * 3}s`)
    el.appendChild(shootingStar)
  }
})
</script>
