const mailList = document.getElementById("mail-list");
const mailView = document.getElementById("mail-view");
const sideNavItems = document.querySelectorAll(".side-nav-item");
const sideNavContainer = document.querySelector(".sideNav-container");
const setting = document.querySelector(".setting");
const profile = document.querySelector(".profile");
const userSetting = document.querySelector(".user-setting");
const userProfile = document.querySelector(".user-profile");


function showMailList(data) {
  data.forEach((mail, index) => {
    const listItem = document.createElement("li");
    listItem.className = "mail-list-item";
    listItem.innerHTML = `
      <div class="mail-list-subject">
        <h3 class="mail-list-title">${mail.title}</h3>
        <p class="mail-list-desc">${mail.subTitle}</p>
      </div>
      <div class="mail-list-info">
        <span>${mail.time}</span>
        <i class="fa-sharp fa-solid fa-reply mail-list-share-icon"></i>
      </div>
    `;

    listItem.setAttribute("data-index", index);


    listItem.addEventListener("click", () => {
      const activeItem = document.querySelector(".mail-list-item.active");
      if (activeItem) activeItem.classList.remove("active");

      listItem.classList.add("active");

      const selectedIndex = listItem.getAttribute("data-index");
      const selectedMail = data[selectedIndex];
      mailViewContent(selectedMail);
    });

    if (index === 0) {
      listItem.classList.add("active");
      mailViewContent(mail);
    }

    mailList.appendChild(listItem);
  });
}

function mailViewContent(mail) {

  let paragraphs = [];

  for (let i = 0; i < mail.content.length; i++) {
    paragraph = mail.content[i];
    paragraphs.push(`<p class="mail-content">${paragraph}</p>`);
  }
  let contentArray = [paragraphs.join('')];

  mailView.innerHTML = `
    <div class="mail-subject">
      <img src="${mail.img}" alt="user" class="user-img">
      <div class="mail-subject-info">
        <h3 class="mail-subject-title">${mail.title}</h3>
        <p class="mail-subject-desc">From: <span class="user-name">${mail.user}</span> <i class="fa-solid fa-angle-down user-name-icon"></i></p>
      </div>
      <ul class="mail-view-icon">
        <li><i class="fa-regular fa-star side-nav-icon"></i></li>
        <li><i class="fa-solid fa-notes-medical side-nav-icon"></i></li>
        <li><i class="fa-solid fa-trash side-nav-icon"></i></li>
        <li><i class="fa-sharp fa-solid fa-reply"></i></li>
      </ul>
    </div>
    <div class="main-view-data"> 
        <p>Hello ${userName},</p>
        ${contentArray}
    </div>
  `;
}

showMailList(mailDataList);

function clearAllMail() {
  mailList.innerHTML = "";
  mailView.innerHTML = "";
}

sideNavItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    const activeNav = document.querySelector(".side-nav-item.active");
    if (activeNav) activeNav.classList.remove("active");

    item.classList.add("active");

    clearAllMail();
    if (index === 0) showMailList(mailDataList);
    if (index === 1) showMailList(sendDataList);
  });
});


setting.addEventListener("click", () => {
  const activeNav = document.querySelector(".side-nav-item.active");
  if (activeNav) activeNav.classList.remove("active");
  sideNavContainer.classList.add("hidden");
  userProfile.classList.add("hidden");
  userSetting.classList.remove("hidden");
})

sideNavItems.forEach(e => {
  e.addEventListener("click", () => {
    sideNavContainer.classList.remove("hidden");
    userProfile.classList.add("hidden");
    userSetting.classList.add("hidden");
  });
})

profile.addEventListener("click", () => {
  const activeNav = document.querySelector(".side-nav-item.active");
  if (activeNav) activeNav.classList.remove("active");
  sideNavContainer.classList.add("hidden");
  userProfile.classList.remove("hidden");
  userSetting.classList.add("hidden");
})


// Regular expressions for validation
String.prototype.isValidUsername = function () {
  return !!this.match(/^(?![\d\s]+$)[A-Za-z\s!@#$%^&*()\-=_+{}[\]:;"'<>,.?/\\|~`]{6,}$/);
}

String.prototype.isEmail = function () {
  return !!this.match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
}

String.prototype.isValidPassword = function () {
  return !!this.match(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[A-Za-z\d!@#$%^&*()]{8,}$/);
}


function handleSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const viewName = document.querySelector(".view-name");
  const viewEmail = document.querySelector(".view-email");

  const errorName = document.querySelector(".error-name");
  const errorEmail = document.querySelector(".error-email");
  const errorPassword = document.querySelector(".error-password");

  const validName = name.isValidUsername();
  const validEmail = email.isEmail();
  const validPassword = password.isValidPassword();


  errorName.textContent = validName ? "" : "Name should have at least 6 characters, no numbers";
  errorEmail.textContent = validEmail ? "" : "Please enter a valid email address";
  errorPassword.textContent = validPassword ? "" : "Password should have at least 8 characters, 1 capital letter, and 1 symbol";

  if (validName && validEmail && validPassword) {
    viewName.textContent = name;
    viewEmail.textContent = email;
  }
}

const submitBtn = document.querySelector(".user-setting-btn");
submitBtn.addEventListener('click', handleSubmit);

