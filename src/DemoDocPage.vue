<template>
  <div v-for="(file,index) in docFileList" :key="index" style="width: 50%;max-height: 300px;overflow: auto">
    <Repl :instanceKey="index+'.vue'" :store="storeSingleton"></Repl>
  </div>

</template>

<script setup>
import Repl from './Repl.vue'
import { ReplStore,File } from './store'
import { gridDemoDocList } from './docTemplate'
const storeSingleton=new ReplStore()
const docFileList=gridDemoDocList.map((d,i)=>new File(i+'.vue',d.code))
storeSingleton.init(docFileList)

</script>
