const { supabase } = require('./database');

async function runDailyAutomation() {
    console.log('\n--- 🤖 Starting Daily Smart Notifications Automation ---');
    const today = new Date();
    const todayMonthDay = today.toISOString().slice(5, 10); // "MM-DD"

    try {
        // 1. Birthday Notifications
        const { data: users } = await supabase
            .from('users')
            .select('id, full_name, birth_date')
            .not('birth_date', 'is', null);

        const bdayNotifications = [];
        users?.forEach(user => {
            if (user.birth_date && user.birth_date.slice(5, 10) === todayMonthDay) {
                bdayNotifications.push({
                    user_id: user.id,
                    title: `🎂 Doğum Günün Kutlu Olsun!`,
                    body: `Sevgili ${user.full_name.split(' ')[0]}, MatchSport ailesi olarak sağlıklı ve spor dolu bir yıl dileriz! 🥳`,
                    type: 'announcement',
                    is_read: false
                });
            }
        });

        if (bdayNotifications.length > 0) {
            await supabase.from('notifications').insert(bdayNotifications);
            console.log(`✅ Sent ${bdayNotifications.length} birthday greetings.`);
        }

        // 2. Inactivity (14 days) Notifications
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(today.getDate() - 14);
        const fourteenDaysAgoISO = fourteenDaysAgo.toISOString();

        // Get all members who are active
        const { data: activeMembers } = await supabase
            .from('memberships')
            .select('user_id, users(full_name)')
            .eq('status', 'active');

        const inactivityNotifications = [];

        if (activeMembers) {
            for (const member of activeMembers) {
                // Check last check-in
                const { data: lastCheckIn } = await supabase
                    .from('check_ins')
                    .select('check_in_time')
                    .eq('user_id', member.user_id)
                    .order('check_in_time', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                // If no check-in or last check-in was more than 14 days ago
                if (!lastCheckIn || new Date(lastCheckIn.check_in_time) < fourteenDaysAgo) {
                    inactivityNotifications.push({
                        user_id: member.user_id,
                        title: `🔥 Seni Özledik!`,
                        body: `Merhaba ${member.users.full_name.split(' ')[0]}, 14 gündür aramızda yoksun. Tembellik yapma, antrenman seni bekliyor! 💪`,
                        type: 'announcement',
                        is_read: false
                    });
                }
            }
        }

        if (inactivityNotifications.length > 0) {
            await supabase.from('notifications').insert(inactivityNotifications);
            console.log(`✅ Sent ${inactivityNotifications.length} inactivity reminders.`);
        }

        // 3. Membership Expiry Alerts (14, 7, 3, 1 days remaining)
        const { data: activeMemberships } = await supabase
            .from('memberships')
            .select('user_id, end_date, users(full_name)')
            .eq('status', 'active');

        const expiryNotifications = [];
        activeMemberships?.forEach(m => {
            const endDate = new Date(m.end_date);
            const diffTime = endDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if ([14, 7, 3, 1].includes(diffDays)) {
                let message = "";
                if (diffDays === 14) message = "Üyeliğinin bitmesine tam 2 hafta kaldı. Devamlılık başarının anahtarıdır, tempoyu bozma! 💪";
                else if (diffDays === 7) message = "Üyeliğinin bitmesine son 1 hafta! Yeni hedefler için planlama yapmaya ne dersin? 🎯";
                else if (diffDays === 3) message = "Son 3 gün! Heyecanını kaybetme, spor salonu seni bekliyor. 🔥";
                else if (diffDays === 1) message = "Üyeliğin yarın sona eriyor! Yarın da antrenmanda görüşürüz değil mi? 😉";

                expiryNotifications.push({
                    user_id: m.user_id,
                    title: `📅 Üyelik Hatırlatması (${diffDays} Gün)`,
                    body: `Selam ${m.users.full_name.split(' ')[0]}, ${message}`,
                    type: 'announcement',
                    is_read: false
                });
            }
        });

        if (expiryNotifications.length > 0) {
            await supabase.from('notifications').insert(expiryNotifications);
            console.log(`✅ Sent ${expiryNotifications.length} expiry alerts.`);
        }

        // 4. Re-engagement for Expired Members (Every 14 days)
        const { data: expiredMemberships } = await supabase
            .from('memberships')
            .select('user_id, end_date, users(full_name)')
            .eq('status', 'expired');

        const reengagementNotifications = [];
        expiredMemberships?.forEach(m => {
            const endDate = new Date(m.end_date);
            const diffTime = today - endDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            // Send at 14, 28, 42... days after expiry
            if (diffDays > 0 && diffDays % 14 === 0) {
                const motivations = [
                    "Seni özledik! Spor salonundaki yerin hala boş duruyor. Gel, kaldığımız yerden devam edelim! 🏋️‍♂️",
                    "Eski formunu özlemedin mi? MatchSport kapıları sana her zaman açık, hedeflerini hatırla! ✨",
                    "Harekete geçmek için pazartesiyi bekleme! Bugün senin günün olsun, seni tekrar görmek istiyoruz. 💪",
                    "Vücuduna bir iyilik yap ve antrenmana geri dön. Senin için özel bir paketimiz olabilir, uğramayı unutma! 📞"
                ];
                // Rotate motivations based on how many 14-day cycles have passed
                const msgIndex = (diffDays / 14 - 1) % motivations.length;

                reengagementNotifications.push({
                    user_id: m.user_id,
                    title: `🔥 Harekete Geçme Vakti!`,
                    body: `Selam ${m.users.full_name.split(' ')[0]}, ${motivations[msgIndex]}`,
                    type: 'announcement',
                    is_read: false
                });
            }
        });

        if (reengagementNotifications.length > 0) {
            await supabase.from('notifications').insert(reengagementNotifications);
            console.log(`✅ Sent ${reengagementNotifications.length} re-engagement messages.`);
        }

        console.log('--- 🤖 Automation Complete ---\n');
    } catch (err) {
        console.error('❌ Automation Error:', err);
    }
}

// Basic scheduler: Run every 24 hours
function startAutomation() {
    // Run immediately on start (optional, maybe wait for first check)
    runDailyAutomation();
    // Then every 24 hours
    setInterval(runDailyAutomation, 24 * 60 * 60 * 1000);
}

module.exports = { startAutomation };
