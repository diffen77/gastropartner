Vision: Ett system som passar behoven hos småskaliga livsmedelsproducenter, restauranger och krögare

Syfte: Gastropartner skall göra det väldigt enkelt för kunder att få en överblick över hur verksamheten går, var det inte genererar tillräckligt med värde och förslag på åtgärder. Kunder skall utan någon bakgrundskunskap lätt och snabbt kunna komma igång med Gastropartner.

Namn: Namnet är Gastropartner och vi har redan registrerat en domän på gastropartner.nu

Målbild: Då Gastropartner.nu skall passa många typer av verksamheter och erbjuda en bred flora av produkter behöver lösningen vara modulär. Varje modul skall ha möjlighet att innehålla en gratis del och en eller flera betaldelar. Allt detta kommer styras av en superadministratör. Exempel på detta är gratis versionen av modulen för att följa upp kostnader, marginal och prissättning av maträtter kan vara så att 50 ingredienser, 5 st recept och 2 maträtter är gratis. Vill kunden öka detta får kunden köpa en månatlig prenumeration via siten. Dvs vi kör en freemium modell.

Modulärt: Hela systemet skall vara modulärt så kunden själv får skräddarsy sin kostnad efter sitt behov. Förslag på moduler är kostnadskontroll på maträtter, personalhanterare, online beställningar (webbformulär där besökare beställer produkter som Gastropartners kunder erbjuder), prognos på försäljning, m.m. Det finns mycket att göra här.

Teknik: Hela systemet skall vara modulärt och vara lätt att skala upp, underhålla och uppdatera. Frontend skall vara React, backend skall vara Python och vi skall alltid använda oss av FastAPI. Koden skall lagras i GitHub och vi använder oss av supabase för datalagring. 

Vi kommer ha en lokal webbserver för utveckling men stagig och prod av supabase kör vi i molnet. Dvs ingen Docker eller liknande på lokal dator.

Design: Designen på sidan skall vara ren, enkel och modern. Jag kan inte nog understryka vikten av en enkel UI/UX då det kommer vara personer som inte är har stor datorvana som kommer använda systemet. Det är också viktigt att systemet både är anpassat för dator och mobila enheter.

Utveckling: Det är viktigt att vi ALLTID har ett flöde från lokal utvecklingsdator till staging och sedan produktion. Vi skall ALLTID jobba med automatiska tester så vi snabbt kan göra förändringar och samla information. Vi får ALDRIG hamna i ett läge där teknik eller tunga processer förhindrar oss att vara snabbfotade i vår utveckling!