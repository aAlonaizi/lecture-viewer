"""تمرين قياس الزمن — درجة واحدة، وبونص اختياري نصف درجة.
Timing activity — 1 mark, plus an optional 0.5-mark bonus.

المطلوب / Your task:
- اكتب قائمة تفاعلية تطلب عدد الأوامر n، وتعود لطلبه بعد كل تجربة.
  Write a menu that asks for n again after each experiment.
- إذا أدخل المستخدم صفرًا، أغلق البرنامج دون إجراء قياس جديد.
  Entering 0 exits without another measurement.
- لكل عدد صحيح موجب، جهز الأوامر ثم قس زمن count_forward بالملّي ثانية.
  For each positive integer, prepare the commands and time count_forward in ms.
- بونص: اعرض الزمن بالثواني بدلًا من الملّي ثانية، مع اسم الوحدة الصحيح.
  Bonus: display the elapsed time in seconds instead of milliseconds.

لا تعدّل الدالتين الجاهزتين. افترض إدخال أعداد صحيحة غير سالبة.
Keep the supplied functions unchanged. Assume non-negative integer input.
"""
from time import perf_counter


def count_forward(commands):
    """Count the forward commands / احسب عدد أوامر التقدم."""
    count = 0
    for command in commands:
        if command == "forward":
            count = count + 1
    return count


def make_commands(n):
    """Prepare exactly n sample commands / جهّز n من أوامر الاختبار."""
    # القائمة فيها عنصران؛ الضرب يكرر القائمة ولا يغيّر الأوامر.
    # Two elements per copy: repeating it n times would create 2*n elements.
    # n // 2 هو عدد الأزواج الكاملة: عند n=6 نكرر الزوج 3 مرات.
    # n // 2 counts complete pairs: n=6 needs 3 copies of the pair.
    commands = ["forward", "left"] * (n // 2)
    # إذا كان n فرديًا، نضيف عنصرًا ليصبح طول القائمة n بالضبط.
    # For odd n, add one element so the length is exactly n.
    if n % 2 == 1:
        commands.append("forward")
    return commands


# تلميح التوقيت / Timing hint:
# perf_counter() يعطي قراءة ساعة بالثواني؛ الضرب في 1000 يحولها إلى ms.
# perf_counter() gives a clock reading in seconds; * 1000 converts it to ms.
# مثال لتسجيل نقطة زمنية واحدة / Example of recording one time point:
# moment_ms = perf_counter() * 1000
# هذه قراءة وليست مدة أو وقت اليوم. المدة = قراءة النهاية - قراءة البداية.
# This is a reading, not a duration or the time of day. Duration = end - start.
# سجّل البداية مباشرة قبل استدعاء count_forward، والنهاية مباشرة بعده.
# Record start immediately before count_forward and end immediately after it.
# الإدخال وmake_commands والطباعة خارج الجزء المقاس.
# Keep input, make_commands, and printing outside the timed section.

# تلميح القائمة / Menu hint:
# استخدم while للتكرار، وinput لقراءة الإدخال وint لتحويله إلى عدد صحيح.
# Use while, input, and int. The value 0 ends the loop.
# جهّز الأوامر باستدعاء make_commands(n) قبل بدء التوقيت.
# Prepare the list by calling make_commands(n) before starting the timer.

# اكتب برنامجك هنا / Write your program here:
