import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { CATEGORY_COLORS, ELEMENTS, Element } from '../constants/elements';
import { colors } from '../constants/theme';

const CELL = 42;

export function PeriodicTableScreen({ onExit }: { onExit: () => void }) {
  const [selected, setSelected] = useState<Element | null>(null);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Periodic Table" onBack={onExit} />

      <View style={styles.info}>
        {selected ? (
          <>
            <Text style={[styles.big, { color: CATEGORY_COLORS[selected.category] }]}>{selected.symbol}</Text>
            <View>
              <Text style={styles.name}>{selected.name}</Text>
              <Text style={styles.meta}>Atomic number {selected.number}</Text>
              <Text style={styles.meta}>{selected.category}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.meta}>Tap an element to see details.</Text>
        )}
      </View>

      <ScrollView horizontal>
        <ScrollView>
          <View style={{ width: CELL * 18, height: CELL * 10 }}>
            {ELEMENTS.map((e) => (
              <Pressable
                key={e.number}
                onPress={() => setSelected(e)}
                style={[
                  styles.cell,
                  { left: e.col * CELL, top: e.row * CELL, backgroundColor: CATEGORY_COLORS[e.category] },
                  selected?.number === e.number && styles.cellOn,
                ]}
              >
                <Text style={styles.num}>{e.number}</Text>
                <Text style={styles.sym}>{e.symbol}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  info: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 80, paddingHorizontal: 20, paddingBottom: 12 },
  big: { fontSize: 48, fontWeight: '900' },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: colors.muted },
  cell: { position: 'absolute', width: CELL - 2, height: CELL - 2, borderRadius: 4, padding: 2 },
  cellOn: { borderWidth: 2, borderColor: '#fff' },
  num: { fontSize: 8, color: '#111827' },
  sym: { fontSize: 14, fontWeight: '800', color: '#111827', textAlign: 'center' },
});
