import { View, StyleSheet, ViewStyle, Text } from 'react-native';
import { Colors, Shadows } from '@/constants/Colors';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    glow?: boolean;
    title?: string;
}

export default function Card({ children, style, glow, title }: CardProps) {
    return (
        <View style={[styles.card, glow ? Shadows.glow : Shadows.card, style]}>
            {title && (
                <Text style={styles.title}>{title}</Text>
            )}
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.cardBackground,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
