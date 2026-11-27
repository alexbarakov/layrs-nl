// A small legend strip: the colours a layer paints buildings with.
import { StyleSheet, View } from 'react-native';

export function Swatches({ colors, width = 44 }: { colors: string[]; width?: number }) {
  return (
    <View style={[styles.strip, { width }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {colors.map((c, i) => <View key={i} style={{ flex: 1, backgroundColor: c }} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { height: 10, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
});
