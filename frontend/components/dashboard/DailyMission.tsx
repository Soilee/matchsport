import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import Card from '@/components/common/Card';

interface Props {
    task: string;
    completed: boolean;
    onToggle?: () => void;
}

export default function DailyMission({ task, completed, onToggle }: Props) {
    return (
        <Card style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.title}>Bugünkü Görev</Text>
                <Ionicons name="gift-outline" size={18} color={Colors.primary} />
            </View>

            <TouchableOpacity
                style={[styles.taskItem, completed && styles.done]}
                onPress={onToggle}
                activeOpacity={0.7}
            >
                <View style={styles.checkbox}>
                    <Ionicons
                        name={completed ? "checkmark-circle" : "ellipse-outline"}
                        size={24}
                        color={completed ? Colors.success : Colors.textMuted}
                    />
                </View>
                <Text style={[styles.taskText, completed && styles.doneText]}>
                    {task}
                </Text>
            </TouchableOpacity>
        </Card>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: Colors.taskTodo,
        padding: 12,
        borderRadius: 12,
    },
    done: {
        backgroundColor: Colors.taskDone,
    },
    checkbox: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    doneText: {
        color: Colors.success,
    }
});
