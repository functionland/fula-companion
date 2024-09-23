let currentPage=1;const itemsPerPage=10,ipfs_gateway="https://ipfs.cloud.fx.land";function setActiveTab(e){document.querySelectorAll(".tab-content").forEach((e=>e.classList.remove("active"))),document.querySelectorAll(".tab-btn").forEach((e=>e.classList.remove("active"))),document.getElementById(e).classList.add("active"),document.getElementById(`${e}-btn`).classList.add("active")}async function saveApiKey(){const e=document.getElementById("apiKey").value.trim();if(e)try{await chrome.storage.local.set({apiKey:e}),await showPinnedItems(e),setActiveTab("pins-tab")}catch(e){showError("Failed to save API key: "+e.message)}else showError("Please enter a valid API key")}async function showPinnedItems(e){showLoading();try{const t=await fetchPinnedItems(e);renderPinnedItems(t),updateXPCounter(t.count),hideLoading(),document.getElementById("pins-tab").classList.remove("hidden"),document.getElementById("settings-tab").classList.add("hidden")}catch(e){hideLoading(),showError("Failed to fetch pinned items: "+e.message)}}async function fetchPinnedItems(e){try{const t=await fetch(`https://api.cloud.fx.land/pins?limit=${itemsPerPage}&offset=${(currentPage-1)*itemsPerPage}&status=pinned&sort=created,desc`,{headers:{Authorization:`Bearer ${e}`}});if(!t.ok){if(500===t.status)throw new Error("Fula API server error. Please try again later.");throw new Error(`HTTP error! status: ${t.status}`)}return await t.json()}catch(e){throw console.error("Error fetching pinned items:",e),e}}function renderPinnedItems(e){const t=document.getElementById("pinnedList");t.innerHTML="",e.results.forEach((e=>{const n=document.createElement("li"),a=document.createElement("a");a.href=`${ipfs_gateway}/gateway/${e.pin.cid}`,a.textContent=e.pin.name||"Unnamed",a.target="_blank",a.addEventListener("click",(async t=>{t.preventDefault();try{console.log("download started");const t=await fetch(a.href),n=await t.blob();let i=e.pin.name||"file";const o=n.type;let s="";console.log("mimeType is : "+o),o.startsWith("text/")?s=".txt":"image/png"===o?s=".png":"image/jpeg"===o?s=".jpg":"image/webp"===o?s=".webp":"video/mp4"===o&&(s=".mp4"),console.log("extension is: "+s),s&&!i.toLowerCase().endsWith(s)&&(i+=s);const c=URL.createObjectURL(n),r=document.createElement("a");r.href=c,r.download=i,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(c)}catch(e){console.error("Download failed:",e),showError("Failed to download file: "+e.message)}})),n.appendChild(a),t.appendChild(n)})),updatePagination(e.count)}function updatePagination(e){const t=Math.ceil(e/itemsPerPage);document.getElementById("pageInfo").textContent=`Page ${currentPage} of ${t}`,document.getElementById("prevPage").disabled=1===currentPage,document.getElementById("nextPage").disabled=currentPage===t}async function changePage(e){currentPage+=e;const{apiKey:t}=await chrome.storage.local.get("apiKey");await showPinnedItems(t)}function showPinningProgress(e,t){const n=document.getElementById("pinningStatusList");let a=document.getElementById(`pinning-${e}`);a||(a=document.createElement("li"),a.id=`pinning-${e}`,n.appendChild(a)),a.textContent=t}function updatePinningStatus(e,t){showPinningProgress(e,t)}function removePinningStatus(e){setTimeout((()=>{const t=document.getElementById(`pinning-${e}`);t&&t.remove()}),1e4)}function updateXPCounter(e){document.getElementById("xp-value").textContent=e}function showLoading(){document.getElementById("loading").classList.remove("hidden")}function hideLoading(){document.getElementById("loading").classList.add("hidden")}function showError(e){const t=document.getElementById("error");t.textContent=e,t.classList.remove("hidden"),setTimeout((()=>{t.classList.add("hidden")}),5e3)}document.addEventListener("DOMContentLoaded",(async function(){try{console.log("Sending initHelia message to background script");const e=await chrome.runtime.sendMessage({action:"initHelia"});if(console.log("Received response from background script:",e),!e||!e.success)throw new Error(e?e.error:"No response from background script");console.log("Helia node is running");const{apiKey:t}=await chrome.storage.local.get("apiKey");t?(await showPinnedItems(t),setActiveTab("pins-tab")):setActiveTab("settings-tab")}catch(e){showError("Failed to initialize Helia: "+e.message)}document.getElementById("saveApiKey").addEventListener("click",saveApiKey),document.getElementById("prevPage").addEventListener("click",(()=>changePage(-1))),document.getElementById("nextPage").addEventListener("click",(()=>changePage(1))),document.querySelectorAll(".tab-btn").forEach((e=>{e.addEventListener("click",(()=>setActiveTab(e.id.replace("-btn",""))))})),chrome.storage.local.get("pinningStatus",(e=>{const t=e.pinningStatus||{};Object.entries(t).forEach((([e,t])=>{"pinned"!==t.status&&"error"!==t.status&&showPinningProgress(e,`${t.status}: ${t.message}`)}))}))})),chrome.runtime.onMessage.addListener(((e,t,n)=>{"pinningStatus"===e.action&&(updatePinningStatus(e.id,`${e.status}: ${e.message}`),"pinned"!==e.status&&"error"!==e.status||removePinningStatus(e.id))}));