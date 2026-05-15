/*** Dark Mode ***
  
  Purpose:
  - Use this starter code to add a dark mode feature to your website.

  When To Modify:
  - [ ] Project 5 (REQUIRED FEATURE) 
  - [ ] Any time after
***/

// Step 1: Select the theme button
let themeButton = document.getElementById("theme-button");
// Step 2: Write the callback function
const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark-mode");
    if (document.documentElement.classList.contains("dark-mode")) {
    themeButton.textContent = "🌙 Dark Mode ON";
    } else {
    themeButton.textContent = " ☀️ Dark Mode OFF";
    }
    
}

// Step 3: Register a 'click' event listener for the theme button,
//             and tell it to use toggleDarkMode as its callback function
themeButton.addEventListener("click", toggleDarkMode)

/*** Form Handling [PLACEHOLDER] [ADDED IN UNIT 6] ***/
// Step 1: Add your query for the submit RSVP button here
let rsvpButton = document.getElementById("rsvp-button")
let count = 3
const addParticipant = (person) => {
    // Step 2: Write your code to manipulate the DOM here
    const newParticipant = document.createElement("p");
    newParticipant.textContent = ` 🌻 ${person.name} from ${person.school} has checked in! `;
    const participantContainer = document.querySelector(".rsvp-participants");
    participantContainer.appendChild(newParticipant);

    

    const oldCount = document.getElementById("rsvp-count");
    if (oldCount) {
        oldCount.remove();
    }
    
    count++;

    const newCount = document.createElement("p");
    newCount.id = "rsvp-count";
    newCount.textContent = "🔔 " + count + " people have checked in!"

    participantContainer.appendChild(newCount)
}

// Step 3: Add a click event listener to the submit RSVP button here


/*** Form Validation [PLACEHOLDER] [ADDED IN UNIT 7] ***/
const validateForm = (event) =>{
    event.preventDefault();
    let containsErrors = false;
    let rsvpInputs = document.getElementById("rsvp-form").elements;

    let person = {
        name: document.getElementById("name").value,
        email:document.getElementById("email").value,
        school: document.getElementById("school").value

    }

    for (let i = 0; i < rsvpInputs.length; i++) {
        const input = rsvpInputs[i];

        if (input.value.trim().length < 2) {
            containsErrors = true;
            input.classList.add("error");
        } else {
            input.classList.remove("error");
        }
        
    }
    
    if(!person.email.includes(".com") || !person.email.includes("@")){
        containsErrors = true;
        document.getElementById("email").classList.add("error");
    } else{
        document.getElementById("email").classList.remove("error");
    }


    if(containsErrors == false){
        addParticipant(person);
        toggleModal(person)
        for (let index = 0; index < rsvpInputs.length; index++) {
            rsvpInputs[index].value = "";  
        }
        
    }
    
}
rsvpButton.addEventListener("click", validateForm);
let revealableContainers = document.querySelectorAll(".revealable");

// Step 2: Write function to reveal elements when they are in view.
const reveal = () => {
    for (let i = 0; i < revealableContainers.length; i++) {
        let current = revealableContainers[i];

        // Get current height of container and window
        let windowHeight = window.innerHeight;
        let topOfRevealableContainer = revealableContainers[i].getBoundingClientRect().top;
        let revealDistance = parseInt(getComputedStyle(current).getPropertyValue('--reveal-distance'), 10);

        // If the container is within range, add the 'active' class to reveal
        if (topOfRevealableContainer < windowHeight - revealDistance) {
            current.classList.add("active");
        }
        // If the container is not within range, hide it by removing the 'active' class
        else { 
            current.classList.remove("active");
        }
    }
}

// Step 3: Whenever the user scrolls, check if any containers should be revealed
window.addEventListener("scroll", reveal);


/*** Success Modal [PLACEHOLDER] [ADDED IN UNIT 9] ***/
const toggleModal = (person) => {
    
    const modal = document.getElementById("success-modal");
    const modalContent =document.getElementById("modal-text");
    // TODO: Update modal display to flex
    modal.style.display = "flex";

    

    modalContent.innerHTML = `
    <p>
                    You're all set ${person.name} ☑️<br>
                    You'll receive updates with wellness tips, journaling prompts, 
                    and future community events designed to support your mental well-being.
                    </p>
    `;
    intervalId = setInterval(animateImage, 500);
    // Set modal timeout to 5 seconds
    setTimeout(() => {
        modal.style.display = 'none';
        clearInterval(intervalId)
    }, 5000);
}


let rotateFactor = 0;
const modalImage = document.querySelector("#modal-image img");
let motionReduced = false;
let intervalId;
const animateImage = () => {
    if (motionReduced) return;
    rotateFactor = (rotateFactor === 0) ? -10 : 0;
    modalImage.style.transform = `rotate(${rotateFactor}deg)`;
}
const modal = document.getElementById("success-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const closeModal = () =>{
    modal.style.display = 'none'
};
closeModalBtn.addEventListener("click", closeModal);

let reduceMotionBtn = document.getElementById("reduce-motion-btn")
const toggleReduceMotion = () => {
    document.body.classList.toggle("reduce-motion");
    motionReduced = !motionReduced;

    // optional: update button text so user knows state
    if (motionReduced) {
        reduceMotionBtn.textContent = "Reduced Motion Off";
    } else {
        reduceMotionBtn.textContent = "💫 Reduced Motion On";
    }
};

reduceMotionBtn.addEventListener("click", toggleReduceMotion);
reveal();