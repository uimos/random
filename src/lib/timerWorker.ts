self.addEventListener('message', (event) => {
  if (event.data.action === 'start') {
    startTimer(event.data.timer);
  } else if (event.data.action === 'stop') {
    clearInterval(self.timerInterval);
  } else if (event.data.action === 'addTime') {
    addTime(event.data.additionalTime);
  }
});

function startTimer(timer: number) {
  self.currentTimer = timer;
  self.timerInterval = setInterval(() => {
    if (self.currentTimer > 0) {
      self.currentTimer--;
      self.postMessage({ message: 'update', timer: self.currentTimer });
      if (self.currentTimer === 60) {
        self.postMessage({ message: 'One minute left' });
      }
    } else {
      clearInterval(self.timerInterval);
      self.postMessage({ message: 'Time is up' });
    }
  }, 1000);
}

function addTime(additionalTime: number) {
  self.currentTimer += additionalTime;
  self.postMessage({ message: 'update', timer: self.currentTimer });
}