const site = new URLSearchParams(location.search).get("site");
document.getElementById("site").textContent = site || "This site";
