// Set the timer duration in milliseconds
const timerDuration = 5000; // 5 seconds

// Perform the screen blocking after the timer is up
setTimeout(() => {
  blockScreen();
}, timerDuration);

// Function to block the screen
function blockScreen() {
  // Create a div element to cover the screen
  const blockerDiv = document.createElement("div");
  blockerDiv.style.position = "fixed";
  blockerDiv.style.top = "0";
  blockerDiv.style.left = "0";
  blockerDiv.style.width = "100%";
  blockerDiv.style.height = "100%";
  blockerDiv.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  blockerDiv.style.zIndex = "9999";

  const img = document.createElement("img");
  img.src =
    "https://www.shutterstock.com/image-vector/times-red-sign-vector-illustration-260nw-1338912215.jpg";

  // Add the div element to the page
  document.body.appendChild(blockerDiv);
  document.body.appendChild(pic);
}