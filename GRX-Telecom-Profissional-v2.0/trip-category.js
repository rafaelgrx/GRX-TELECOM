/* Reclassifica a categoria Viagem para Manutenção para novos registros.
   Registros antigos de viagem em Alimentação continuam disponíveis para consulta. */
(function(){
  "use strict";
  function init(){
    var items=document.getElementById("itensWrap");
    var foodForm=document.getElementById("fAlim");
    if(!items||!foodForm)return;

    function ensureTravelOption(){
      if(!items.querySelector('[data-item="Viagem"]')){
        var chip=document.createElement("button");
        chip.type="button";
        chip.className="chip";
        chip.setAttribute("data-item","Viagem");
        chip.setAttribute("aria-pressed","false");
        chip.textContent="Viagem";
        items.appendChild(chip);
      }
    }

    ensureTravelOption();
    new MutationObserver(ensureTravelOption).observe(items,{childList:true});

    var legacyNote=document.createElement("p");
    legacyNote.id="legacyTripNote";
    legacyNote.className="hint";
    legacyNote.setAttribute("role","status");
    legacyNote.hidden=true;
    legacyNote.textContent="Viagem foi movida para Manutenção. Esta aba mantém apenas o histórico antigo de viagens.";
    foodForm.parentNode.insertBefore(legacyNote,foodForm);

    function updateLegacyView(){
      var oldTripTab=document.querySelector('#alimTabs [data-cat="viagem"]');
      var isLegacyTrip=!!oldTripTab&&oldTripTab.getAttribute("aria-pressed")==="true";
      legacyNote.hidden=!isLegacyTrip;
      foodForm.hidden=isLegacyTrip;
    }
    var tabs=document.getElementById("alimTabs");
    if(tabs){
      new MutationObserver(updateLegacyView).observe(tabs,{childList:true,subtree:true,attributes:true,attributeFilter:["aria-pressed"]});
      tabs.addEventListener("click",function(){setTimeout(updateLegacyView,0);});
    }
    updateLegacyView();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
