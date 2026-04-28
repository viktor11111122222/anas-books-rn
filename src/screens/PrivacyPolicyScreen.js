import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';

const SECTIONS = [
  {
    title: 'Ko je administrator podataka',
    body: 'Administrator podataka o ličnosti je AnasBooks (u daljem tekstu: "mi", "nas", "naš"). Ova politika privatnosti odnosi se na sve podatke prikupljene putem mobilne aplikacije AnasBooks. Za sva pitanja možeš nas kontaktirati na: podrska@anasbooks.rs',
  },
  {
    title: 'Koje podatke prikupljamo',
    body: 'Prikupljamo isključivo sledeće podatke:\n\n• Email adresa — unosiš je pri registraciji i koristimo je za identifikaciju naloga\n• Wishlist i biblioteka — spisak knjiga koje dodaš čuva se na našim serverima isključivo radi pružanja usluge\n• Fotografija profila — čuva se isključivo lokalno na tvom uređaju i nikada se ne prenosi na naše servere\n• Tehnički podaci — anonimni podaci o greškama u radu aplikacije (bez ličnih podataka)\n\nNe prikupljamo ime, prezime, adresu, broj telefona, lokaciju niti bilo koje druge lične podatke.',
  },
  {
    title: 'Pravni osnov za obradu podataka',
    body: 'Obrađujemo tvoje podatke na osnovu:\n\n• Izvršenja ugovora — email adresa je neophodna za kreiranje i upravljanje nalogom (čl. 12 st. 1 tač. 2 ZZPL)\n• Legitimnog interesa — anonimni tehnički podaci koriste se radi poboljšanja stabilnosti aplikacije\n• Pristanka — za slanje obaveštenja o akcijama, samo ako to izričito uključiš u podešavanjima\n\nGde je osnov pristanak, možeš ga povući u svakom trenutku bez posledica po korišćenje ostalih funkcija aplikacije.',
  },
  {
    title: 'Kako koristimo tvoje podatke',
    body: 'Email adresu koristimo isključivo za:\n• Prijavu u nalog\n• Slanje linka za resetovanje lozinke (samo na tvoj zahtev)\n• Obaveštenja o akcijama i popustima (samo uz tvoj pristanak)\n• Obaveštavanje o važnim izmenama uslova ili politike privatnosti\n\nNikada te nećemo kontaktirati u reklamne svrhe bez tvoje izričite saglasnosti. Tvoji podaci se ne koriste za profilisanje niti za automatizovano donošenje odluka koje bi mogle imati pravne ili slične posledice po tebe.',
  },
  {
    title: 'Period čuvanja podataka',
    body: 'Podatke čuvamo samo onoliko dugo koliko je neophodno:\n\n• Dok je nalog aktivan — email i podaci o wishlist/biblioteci čuvaju se aktivno\n• Nakon brisanja naloga — svi podaci se trajno brišu u roku od 30 dana od podnošenja zahteva\n• Anonimni tehnički podaci — čuvaju se do 12 meseci radi analize i unapređenja aplikacije\n\nAko nalog ostane neaktivan duže od 24 meseca, obavešćujemo te putem emaila i dajemo rok od 30 dana za reaktivaciju pre brisanja podataka.',
  },
  {
    title: 'Bezbednost podataka',
    body: 'Preduzimamo sledeće tehničke i organizacione mere zaštite:\n\n• Lozinke se nikada ne čuvaju u čitljivom obliku — koristimo bcrypt kriptografski hash\n• JWT tokeni za sesiju čuvaju se u Secure Store memoriji uređaja, izolovano od ostatka aplikacije\n• Komunikacija između aplikacije i servera šifrovana je putem HTTPS protokola\n\nU slučaju povrede bezbednosti podataka koja bi mogla ugroziti tvoja prava i slobode, bićeš obavešten/a u roku od 72 sata od saznanja o povredi, u skladu sa zakonskim obavezama.',
  },
  {
    title: 'Deljenje sa trećim stranama',
    body: 'Ne prodajemo, ne iznajmljujemo niti delimo tvoje lične podatke sa trećim stranama ni u koje komercijalne svrhe.\n\nPodaci o cenama knjiga prikupljaju se automatski sa javno dostupnih stranica knjižara — ovaj proces ne uključuje nikakve lične podatke korisnika.\n\nAplikacija može sadržati linkove ka sajtovima knjižara. AnasBooks nije odgovoran za politike privatnosti tih sajtova i preporučujemo da ih pročitaš pre kupovine.',
  },
  {
    title: 'Kolačići i lokalna memorija',
    body: 'Aplikacija ne koristi kolačiće (cookies). Koristimo sledeće mehanizme lokalnog čuvanja podataka:\n\n• Secure Store — čuva JWT token za sesiju i email korisnika, zaštićeno enkripcijom uređaja\n• AsyncStorage — čuva wishlist i biblioteku lokalno radi brzog prikaza bez čekanja na server\n• Fotografija profila — čuva se isključivo lokalno u memoriji uređaja\n\nSvi lokalni podaci brišu se odjavom ili brisanjem aplikacije.',
  },
  {
    title: 'Deca i maloletna lica',
    body: 'Aplikacija nije namenjena licima mlađim od 13 godina. Svesno ne prikupljamo podatke maloletnih lica. Ako saznaš da je maloletno lice kreiralo nalog, kontaktiraj nas na podrska@anasbooks.rs i odmah ćemo obrisati nalog i sve povezane podatke.',
  },
  {
    title: 'Tvoja prava',
    body: 'U skladu sa Zakonom o zaštiti podataka o ličnosti (ZZPL), imaš pravo da:\n\n• Pristupiš podacima koji se obrađuju o tebi\n• Zahtevаš ispravku netačnih podataka\n• Zahtevаš brisanje podataka ("pravo na zaborav")\n• Zahtevаš ograničenje obrade\n• Prenesеš podatke drugom rukovaocu (pravo na prenosivost)\n• Opovrgneš obradu zasnovanu na legitimnom interesu\n• Povučeš pristanak za marketinška obaveštenja u bilo kom trenutku\n\nZahteve upućuj na: podrska@anasbooks.rs\nOdgovaramo u roku od 30 dana od prijema zahteva.',
  },
  {
    title: 'Pravo na pritužbu Povereniku',
    body: 'Ako smatraš da obrađujemo tvoje podatke suprotno zakonu, imaš pravo da podneseš pritužbu Povereniku za informacije od javnog značaja i zaštitu podataka o ličnosti:\n\nPoverenik za informacije od javnog značaja\ni zaštitu podataka o ličnosti\nBulevar kralja Aleksandra 15, 11000 Beograd\nweb: www.poverenik.rs\nemail: office@poverenik.rs\n\nPreporučujemo da pre podnošenja pritužbe kontaktiraš nas direktno — trudićemo se da rešimo svaki problem.',
  },
  {
    title: 'Izmene politike privatnosti',
    body: 'Zadržavamo pravo izmene ove politike. O svim značajnim promenama bićeš obavešten/a putem email adrese vezane za nalog, najmanje 14 dana pre stupanja izmena na snagu. Nastavljanjem korišćenja aplikacije nakon isteka tog roka smatra se da si prihvatio/la izmene.',
  },
  {
    title: 'Kontakt',
    body: 'Za sva pitanja, zahteve ili pritužbe u vezi sa zaštitom podataka:\n\nEmail: podrska@anasbooks.rs\n\nOdgovaramo u roku od 5 radnih dana.',
  },
];

export function PrivacyPolicyScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={20} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Politika privatnosti</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.iconBg}>
            <Ionicons name="shield-checkmark" size={28} color={colors.violet} />
          </View>
          <Text style={styles.introTitle}>Tvoja privatnost nam je važna</Text>
          <Text style={styles.introText}>
            Ova politika objašnjava koje podatke prikupljamo, zašto i kako ih koristimo,
            u skladu sa Zakonom o zaštiti podataka o ličnosti (ZZPL) Republike Srbije.{'\n'}
            Poslednja izmena: april 2025.
          </Text>
        </View>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
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
  content: { padding: 20, gap: 20 },
  intro: {
    backgroundColor: colors.white, borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8,
  },
  iconBg: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.violet + '14',
    justifyContent: 'center', alignItems: 'center',
  },
  introTitle: { fontSize: 17, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
  introText: { fontSize: 13, color: colors.muted, textAlign: 'center', lineHeight: 19 },
  section: {
    backgroundColor: colors.white, borderRadius: 16, padding: 18, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  sectionBody: { fontSize: 14, color: colors.muted2, lineHeight: 21 },
});
