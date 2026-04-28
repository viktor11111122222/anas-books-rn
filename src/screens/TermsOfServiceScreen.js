import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';

const SECTIONS = [
  {
    title: 'Prihvatanje uslova',
    body: 'Kreiranjem naloga i korišćenjem aplikacije AnasBooks potvrđuješ da si pročitao/la i da prihvataš ove Uslove korišćenja u celosti. Ako se ne slažeš sa bilo kojim delom ovih uslova, moliš te da obrišeš nalog i prestaneš sa korišćenjem aplikacije.\n\nOvi Uslovi se primenjuju zajedno sa našom Politikom privatnosti, koja je dostupna u sekciji Informacije u profilu.',
  },
  {
    title: 'Opis usluge',
    body: 'AnasBooks je mobilna aplikacija za pretragu i poređenje cena knjiga iz različitih srpskih knjižara. Prikupljamo i prikazujemo javno dostupne cene isključivo u informativne svrhe.\n\nAnasBooks:\n• Ne vrši prodaju knjiga\n• Ne posreduje u transakcijama između korisnika i knjižara\n• Ne garantuje dostupnost knjige niti rok isporuke\n• Nije strana ugovora između korisnika i knjižare',
  },
  {
    title: 'Licenca za korišćenje',
    body: 'AnasBooks ti dodeljuje ograničenu, neekskluzivnu, neprenosivu i opozivu licencu za korišćenje aplikacije isključivo u lične, nekomercijalne svrhe, u skladu sa ovim Uslovima.\n\nOva licenca ne uključuje pravo da:\n• Kopiraš, modifikuješ ili distribuiraš aplikaciju ili njen izvorni kod\n• Koristiš aplikaciju u komercijalne svrhe ili u ime trećih lica\n• Dekompajliraš ili na drugi način pokušaš da dođeš do izvornog koda\n• Prenosiš licencu drugom licu\n\nAnasBooks zadržava sva prava koja nisu izričito dodeljena ovom licencom.',
  },
  {
    title: 'Korisnički nalog',
    body: 'Za korišćenje aplikacije neophodno je kreirati nalog sa validnom email adresom. Odgovoran/na si za:\n• Čuvanje lozinke i podataka za prijavu u tajnosti\n• Sve aktivnosti koje se odvijaju putem tvog naloga\n• Tačnost podataka koje unosiš\n• Odmah obaveštavanje AnasBooks ako posumnjаš da je nalog kompromitovan\n\nNalog je strogo lični i nije dozvoljena podela pristupa sa drugim licima. Kreiranje naloga je zabranjeno licima mlađim od 13 godina.',
  },
  {
    title: 'Dozvoljeno korišćenje',
    body: 'Aplikacija se sme koristiti isključivo u lične, nekomercijalne svrhe i u skladu sa zakonodavstvom Republike Srbije.\n\nNije dozvoljeno:\n• Automatizovano preuzimanje podataka iz aplikacije (scraping, crawling)\n• Kreiranje višestrukih naloga radi zloupotrebe usluge\n• Pokušaj neovlašćenog pristupa serverima ili infrastrukturi aplikacije\n• Ometanje normalnog rada aplikacije ili infrastrukture\n• Korišćenje aplikacije za bilo kakve nezakonite aktivnosti\n• Lažno predstavljanje ili prikrivanje identiteta',
  },
  {
    title: 'Plaćanja i pretplate',
    body: 'AnasBooks je potpuno besplatna aplikacija. Ne postoje nikakve pretplate, premijum funkcije niti in-app kupovine. Sve funkcije aplikacije dostupne su bez naknade.\n\nAnasBooks ne prima nikakva plaćanja od korisnika niti od knjižara čije cene prikazuje.',
  },
  {
    title: 'Tačnost cena i informativnost',
    body: 'Cene prikazane u aplikaciji preuzimaju se automatski sa javno dostupnih stranica knjižara i mogu se razlikovati od stvarnih cena u trenutku kupovine iz sledećih razloga:\n• Kašnjenje u ažuriranju podataka\n• Privremene akcije ili greške na strani knjižare\n• Regionalne razlike u cenama\n\nAnasBooks ne garantuje tačnost, potpunost niti ažurnost prikazanih cena. Pre svake kupovine uvek proveri cenu direktno na sajtu knjižare.',
  },
  {
    title: 'Eksterni linkovi i knjižare',
    body: 'Aplikacija sadrži linkove ka sajtovima knjižara. Klikom na takav link napuštaš aplikaciju AnasBooks i prelaziš na sajt koji nije pod našom kontrolom.\n\nAnasBooks:\n• Nije odgovoran za sadržaj, politike privatnosti niti prakse trećih sajtova\n• Nije strana ugovora koji zaključuješ sa knjižarom\n• Ne garantuje sigurnost transakcija obavljenih na trećim sajtovima\n\nPreporučujemo da pre kupovine pročitaš politiku privatnosti i uslove korišćenja odgovarajuće knjižare.',
  },
  {
    title: 'Dostupnost usluge',
    body: 'Trudimo se da aplikacija bude dostupna 24 sata dnevno, 7 dana u nedelji, ali ne garantujemo neprekidni rad.\n\nAnasBooks zadržava pravo da:\n• Privremeno ili trajno isključi uslugu radi održavanja, unapređenja ili iz tehničkih razloga\n• Izmeni, ograniči ili ukine bilo koju funkciju aplikacije\n• Ukloni određene knjižare ili izvore podataka\n\nNe odgovaramo za štetu nastalu privremenom nedostupnošću usluge.',
  },
  {
    title: 'Intelektualna svojina',
    body: 'Sva prava na aplikaciju AnasBooks, uključujući dizajn, kod, logo i tekstualne sadržaje, vlasništvo su AnasBooks tima i zaštićena su autorskim pravom. Nije dozvoljeno njihovo kopiranje, reprodukovanje niti distribucija bez pisane dozvole.\n\nSlike korica knjiga, nazivi dela i podaci o autorima vlasništvo su njihovih originalnih nositelja prava. AnasBooks ih prikazuje isključivo u informativne svrhe, pozivajući se na doktirnu poštene upotrebe (fair use).\n\nAko smatraš da je tvoje autorsko pravo povređeno, kontaktiraj nas na podrska@anasbooks.rs.',
  },
  {
    title: 'Ograničenje odgovornosti',
    body: 'Aplikacija se pruža "kakva jeste" (as-is), bez ikakvih izričitih ili podrazumevanih garancija.\n\nAnasBooks nije odgovoran za:\n• Gubitke nastale kupovinom na osnovu cena prikazanih u aplikaciji\n• Razliku između prikazane i stvarne cene u knjižari\n• Tehničke probleme uzrokovane trećim stranama ili infrastrukturom\n• Gubitak podataka usled tehničkih kvarova\n• Štetu nastalu neovlašćenim pristupom nalogu od strane trećih lica\n\nU meri u kojoj to dopušta primenljivo pravo, ukupna odgovornost AnasBooks je ograničena na 0 RSD, s obzirom da je usluga besplatna.',
  },
  {
    title: 'Ukidanje naloga',
    body: 'Ti možeš u bilo kom trenutku zatražiti brisanje naloga slanjem zahteva na podrska@anasbooks.rs. Nalog i svi povezani podaci biće trajno obrisani u roku od 30 dana.\n\nAnasBooks može bez prethodne najave privremeno suspendovati ili trajno ukinuti nalog ako:\n• Utvrdi kršenje ovih Uslova korišćenja\n• Posumnja na zloupotrebu ili neovlašćenu upotrebu naloga\n• Je to neophodno radi zaštite sistema ili drugih korisnika\n• To zahteva nadležni organ\n\nU slučaju trajnog ukidanja naloga zbog kršenja Uslova, korisnik nema pravo na kompenzaciju.',
  },
  {
    title: 'Izmene uslova',
    body: 'Zadržavamo pravo izmene ovih Uslova korišćenja u bilo kom trenutku. O svim značajnim promenama bićeš obavešten/a putem email adrese navedene pri registraciji, najmanje 14 dana pre stupanja izmena na snagu.\n\nNastavak korišćenja aplikacije nakon isteka tog roka smatra se prihvatanjem novih uslova. Ako se ne slažeš sa izmenama, možeš obrisati nalog pre stupanja izmena na snagu.',
  },
  {
    title: 'Razdvojivost odredbi',
    body: 'Ukoliko nadležni sud utvrdi da je neka odredba ovih Uslova nevažeća ili neizvršiva, ta odredba biće izolovana i uklonjena, a sve ostale odredbe ostaju na snazi u punom obimu. Nevažeća odredba biće zamenjena važećom odredbom koja je najbliža originalnoj nameri.',
  },
  {
    title: 'Primenjivo pravo i nadležnost',
    body: 'Ovi Uslovi korišćenja tumače se i primenjuju u skladu sa zakonodavstvom Republike Srbije, bez primene kolizionih normi.\n\nZa sve sporove koji proisteknu iz primene ovih Uslova stranke se obavezuju da će pre pokretanja sudskog postupka pokušati da spor reše mirnim putem. U slučaju da mirno rešavanje spora nije moguće, nadležan je sud u Beogradu.',
  },
  {
    title: 'Kontakt',
    body: 'Za sva pitanja, primedbe ili zahteve u vezi sa ovim Uslovima:\n\nEmail: podrska@anasbooks.rs\n\nOdgovaramo u roku od 5 radnih dana.',
  },
];

export function TermsOfServiceScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={20} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Uslovi korišćenja</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.iconBg}>
            <Ionicons name="document-text" size={28} color={colors.sky} />
          </View>
          <Text style={styles.introTitle}>Uslovi korišćenja aplikacije</Text>
          <Text style={styles.introText}>
            Korišćenjem aplikacije AnasBooks potvrđuješ da prihvataš sledeće uslove.{'\n'}
            Poslednja izmena: april 2025.
          </Text>
        </View>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNumber}>{i + 1}</Text>
              <Text style={styles.sectionTitle}>{s.title}</Text>
            </View>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={{ height: 40 + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F4F4FB', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark },
  content: { padding: 20, gap: 16 },
  intro: {
    backgroundColor: colors.white, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  iconBg: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.sky + '1A',
    justifyContent: 'center', alignItems: 'center',
  },
  introTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  introText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  section: {
    backgroundColor: colors.white, borderRadius: 16, padding: 18, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionNumber: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.sky + '1A',
    textAlign: 'center', lineHeight: 26,
    fontSize: 13, fontWeight: '700', color: colors.sky,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark, flex: 1 },
  sectionBody: { fontSize: 14, color: colors.muted2, lineHeight: 21 },
});
