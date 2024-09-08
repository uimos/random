<script>
  import '../app.css';
</script>

<div class='text-white flex flex-col min-h-screen'>
  <main class="flex-1 mt-4 self-center w-screen md:w-4/5 lg:w-3/5">
    <slot />
  </main>
  <footer class='bg-neutral-700 text-white p-4 text-center flex flex-row space-x-0 text-xs'>
    <div class='flex-1'>
      <div class='flex flex-row gap-3'>
        <div>Who Presents First</div>
        <div>Created by uimos</div>
        <div><a href="https://uimos.io/" target="_blank">Contact Me</a></div>
      </div>
    </div>
    <div>
      <div class='flex flex-row gap-3'>
        <div>Hackerspace MMU</div>
        <div>v4.0</div>
      </div>
    </div>
  </footer>
</div>