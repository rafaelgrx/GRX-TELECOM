/* Adds an explicit camera action while preserving normal file selection. */
(function(){
  "use strict";
  function addCameraButton(inputId){
    var input=document.getElementById(inputId);
    if(!input||!input.parentNode)return;
    var button=document.createElement("button");
    button.type="button";
    button.className="btn line mini";
    button.textContent="Usar câmera";
    button.setAttribute("aria-label","Tirar foto do comprovante com a câmera");
    button.style.marginTop="8px";
    input.parentNode.insertBefore(button,input.nextSibling);

    function clearCapture(){input.removeAttribute("capture");}
    button.addEventListener("click",function(){
      input.setAttribute("capture","environment");
      input.click();
    });
    input.addEventListener("change",clearCapture);
    input.addEventListener("cancel",clearCapture);
    window.addEventListener("focus",function(){setTimeout(clearCapture,500);});
  }
  function init(){addCameraButton("mFoto");addCameraButton("aFoto");}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
