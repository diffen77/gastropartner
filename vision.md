Vision: Ett system som passar behoven hos småskaliga livsmedelsproducenter, restauranger och krögare

# Syfte
För mindre och medelstora aktörer inom restaurang och matproduktion ge en snabb och tydlig bild över verksamheten till en billig penning.

Gastropartner är även en plats där recept, processer och all nödvändig information finns som berör verksamheten. 

Gastropartner skall ta bort onödigt krångel för kunden och istället ge en smidig upplevelse som presenterar relevant och korrekt information för kunden i alla lägen.

# Namn
Namnet är Gastropartner och vi har redan registrerat en domän på gastropartner.nu

# MVP
I en MVP skall det finnas tillgång ingredienshantering, receptbyggare och måltidsbyggare. Det skall även gå att mäta försäljning på recept (kan vara exempelvis bröd, charkprodukter osv) och måltider (recept eller ingredienser som är kombinerade) Vi kallar den modulen för Recepthantering. 

Varje recept skall utgå från kilo, gram, liter och ml. Dvs om vi gör korv så är receptet utifrån kg kött och kostnaden visas också på det. Ett exempel är korv: 1 kg fläskkött 2% salt (eller gram om man vill), 0,25% svartpeppar osv. Räkna sedan ut råvarukostnaderna.

Varje måltidsbyggare skall innehålla hur mycket av recepten som skall användas. Exempelvis 1 portion korv med mos innehåller 75 gram korv, 60 gram potatismos, 20 gram rårörda lingon och 20 gram inlagd gurka. I måltidsbyggaren anger kunden vad gästens pris blir (exempelvis 129 kr). Detta pris är inklusive moms så då måste måltidsbyggaren visa priset exklusive moms och marginal på maträtten i gånger (3,5) och kronor (alltid exklusive moms).

Det skall även finnas en försäljningsmodel där ägaren för restaurangen kan mata in försäljning på olika recept eller måltider. Exempel kan vara datum, lista på alla recept och måltider som finns samt hur många som är sålda av varje enhet.

Sist ska det även finnas en modul som visar rapporter över datat som är inmatat, men också relevanta analyser gjorda på datat.

Kunder skall ha möjlighet att registrera sig och sitt bolag och det skall finnas en onboarding lösning där grundläggande information matas in. Kunderna har även tillgång till en inställningssida där de kan uppdatera information om sina bolag osv.

# Affärsmodell
Freemium, dvs grundläggande gratis för alla moduler inom applikationen men sedan full tillgång till ett premiumpris.

## Målbild
Då Gastropartner.nu skall passa många typer av verksamheter och erbjuda en bred flora av produkter behöver lösningen vara modulär. Varje modul skall ha möjlighet att innehålla en gratis del och en eller flera betaldelar. Allt detta kommer styras av en superadministratör. Exempel på detta är gratis versionen av modulen för att följa upp kostnader, marginal och prissättning av maträtter kan vara så att 50 ingredienser, 5 st recept och 2 maträtter är gratis. Vill kunden öka detta får kunden köpa en månatlig prenumeration via siten. Dvs vi kör en freemium modell.

## Modulärt system
Hela systemet skall vara modulärt så kunden själv får skräddarsy sin kostnad efter sitt behov. Förslag på moduler är kostnadskontroll på maträtter, personalhanterare, online beställningar (webbformulär där besökare beställer produkter som Gastropartners kunder erbjuder), prognos på försäljning, m.m. Det finns mycket att göra här.

# Teknik
Multi Tenant som hostas online. Backend körs via Python med FastAPI och Frontend är React. Databasen är Supabase.

Hela systemet skall vara modulärt och vara lätt att skala upp, underhålla och uppdatera. Frontend skall vara React, backend skall vara Python och vi skall alltid använda oss av FastAPI. Koden skall lagras i GitHub och vi använder oss av supabase för datalagring. 


# Design
Designen på sidan skall vara ren, enkel och modern. Jag kan inte nog understryka vikten av en enkel UI/UX då det kommer vara personer som inte är har stor datorvana som kommer använda systemet. Det är också viktigt att systemet både är anpassat för dator och mobila enheter.

# Utveckling
Det är viktigt att vi ALLTID har ett flöde från lokal utvecklingsdator till staging och sedan produktion. Vi skall ALLTID jobba med automatiska tester så vi snabbt kan göra förändringar och samla information. Vi får ALDRIG hamna i ett läge där teknik eller tunga processer förhindrar oss att vara snabbfotade i vår utveckling!