import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { login } from '@/services/api';

export default function LoginScreen() {
    const [email, setEmail] = useState('admin@matchlessfitness.com');
    const [password, setPassword] = useState('123456');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        try {
            setLoading(true);
            await login(email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Hata', 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Ionicons name="flash" size={64} color={Colors.primary} />
                        <Text style={styles.title}>MATCHLESS</Text>
                        <Text style={styles.subtitle}>7/24 Kesintisiz Fitness Deneyimi</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="E-posta Adresiniz"
                                placeholderTextColor={Colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Şifreniz"
                                placeholderTextColor={Colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>
                                {loading ? 'Giriş Yapılıyor...' : 'GİRİŞ YAP'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={() => Alert.alert('Kayıt', 'Yeni üye kaydı sadece Admin veya Hocalar tarafından panel üzerinden yapılmaktadır. Lütfen salon bankosuyla iletişime geçin.')}
                        >
                            <Text style={styles.registerText}>
                                Üye değil misin? <Text style={styles.registerTextBold}>Salon ile iletişime geç.</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: Colors.text,
        marginTop: 16,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        marginTop: 8,
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: Colors.text,
        fontSize: 16,
        height: '100%',
    },
    loginButton: {
        backgroundColor: Colors.primary,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    registerButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    registerText: {
        color: Colors.textMuted,
        fontSize: 14,
    },
    registerTextBold: {
        color: Colors.primary,
        fontWeight: '700',
    }
});
