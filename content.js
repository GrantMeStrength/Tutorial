/* =========================================================================
   content.js  —  the pre-authored, pre-verified content library.
   The engine never generates code; it only SELECTS a variant per stage
   based on the reader's current "path" (gentle / standard / challenge).

   Schema:
     QUEST.intro                     level-setting page
     QUEST.stages[]                  { id, title, concept, variants }
        variants.gentle|standard|challenge  { html, checkpoint }
     QUEST.outro                     closing page (path recap injected)

   Each variant is a self-contained "page". Adding a new depth or a new
   stage is a data edit — no engine changes.
   ========================================================================= */

const LEVELS = ["gentle", "standard", "challenge"];
const LEVEL_LABEL = { gentle: "Scenic", standard: "Standard", challenge: "Expert" };

const QUEST = {
  intro: {
    eyebrow: "The threshold",
    title: "Hello, WinUI 3",
    html: `
      <p class="lead">You stand at the mouth of the dungeon. By the end of this quest you'll have built a
      real <strong>WinUI&nbsp;3</strong> desktop app in C# &mdash; a window, controls, an event, and live data binding.</p>
      <p>This gamebook <em>reads you</em>. After each room I'll ask how it's going. Say it's too easy and the
      path steepens; say it's too much and it gentles. You can change your answer at any checkpoint &mdash;
      the adventure re-routes.</p>
      <p>First, level-set: <strong>how comfortable are you with C# and desktop UI?</strong></p>
    `,
    choices: [
      { label: "New to this", sub: "Explain the why, small steps, no assumptions", level: "gentle" },
      { label: "I've built apps before", sub: "A balanced pace", level: "standard" },
      { label: "Seasoned &mdash; challenge me", sub: "Terse, plus bonus tasks", level: "challenge" }
    ]
  },

  stages: [
    /* ---------------------------------------------------------------- 1 */
    {
      id: "setup",
      title: "Room I — Forge the Project",
      concept: "Create a WinUI 3 app",
      variants: {
        gentle: {
          html: `
            <p>Every app starts as an empty project &mdash; think of it as an unfurnished room we'll decorate.</p>
            <p>Open <strong>Visual Studio 2022</strong> and choose <em>Create a new project</em>. In the template
            search box, type <code class="inline">WinUI</code>, then pick:</p>
            <pre>Blank App, Packaged (WinUI 3 in Desktop)   —   C#</pre>
            <p>Name it <code class="inline">HelloWinUI</code> and click <em>Create</em>. Press <strong>F5</strong>.
            A blank window appears &mdash; that's your app running. You've already shipped something!</p>
            <div class="note"><span class="note-title">Why "Packaged"?</span>
            It bundles your app the modern Windows way, so it can update cleanly later. You don't need to think about it today.</div>
          `,
          checkpoint: { q: "Did the blank window run with F5?", hint: "First room's the trickiest for setup." }
        },
        standard: {
          html: `
            <p>In <strong>Visual Studio 2022</strong>, create a new project from the
            <strong>Blank App, Packaged (WinUI 3 in Desktop)</strong> C# template. Name it
            <code class="inline">HelloWinUI</code>.</p>
            <pre>New Project → search "WinUI" → Blank App, Packaged (WinUI 3 in Desktop) — C#</pre>
            <p>Press <strong>F5</strong> to build and run. You should get an empty window titled <em>HelloWinUI</em>.</p>
          `,
          checkpoint: { q: "Blank window up and running?", hint: "" }
        },
        challenge: {
          html: `
            <p>Scaffold a <strong>Blank App, Packaged (WinUI 3 in Desktop)</strong> C# project named
            <code class="inline">HelloWinUI</code> and run it.</p>
            <div class="bonus"><span class="note-title">Bonus</span>
            Skim the generated files. Know what <code class="inline">App.xaml</code>,
            <code class="inline">MainWindow.xaml</code>, and the <code class="inline">.xaml.cs</code> code-behind
            each do before you move on.</div>
          `,
          checkpoint: { q: "Project runs — ready to move fast?", hint: "" }
        }
      }
    },

    /* ---------------------------------------------------------------- 2 */
    {
      id: "window",
      title: "Room II — Speak the First Words",
      concept: "Edit MainWindow.xaml, add a TextBlock",
      variants: {
        gentle: {
          html: `
            <p>The window's <em>look</em> lives in <strong>MainWindow.xaml</strong> &mdash; a file written in XAML,
            a markup language a bit like HTML. Open it and find the <code class="inline">&lt;StackPanel&gt;</code>.
            A StackPanel simply stacks whatever you put inside it, top to bottom.</p>
            <p>Replace what's inside the window with this:</p>
            <pre>&lt;StackPanel Orientation="Vertical" Spacing="12" Padding="24"
            HorizontalAlignment="Center" VerticalAlignment="Center"&gt;
    &lt;TextBlock Text="Hello, WinUI 3!" FontSize="28" /&gt;
&lt;/StackPanel&gt;</pre>
            <p>A <code class="inline">TextBlock</code> shows text. Press <strong>F5</strong> &mdash; your greeting
            appears, centered. You just wrote UI!</p>
            <div class="note"><span class="note-title">Reading XAML</span>
            Everything in <code class="inline">Name="value"</code> form is a <em>property</em>: the text to show,
            how big, where to sit.</div>
          `,
          checkpoint: { q: "See your greeting centered in the window?", hint: "" }
        },
        standard: {
          html: `
            <p>Open <strong>MainWindow.xaml</strong> and place a <code class="inline">TextBlock</code> inside the
            root <code class="inline">StackPanel</code>:</p>
            <pre>&lt;StackPanel Orientation="Vertical" Spacing="12" Padding="24"
            HorizontalAlignment="Center" VerticalAlignment="Center"&gt;
    &lt;TextBlock Text="Hello, WinUI 3!" FontSize="28" /&gt;
&lt;/StackPanel&gt;</pre>
            <p>Run it &mdash; the greeting renders centered. XAML properties are set with
            <code class="inline">Name="value"</code> attributes.</p>
          `,
          checkpoint: { q: "Greeting rendering as expected?", hint: "" }
        },
        challenge: {
          html: `
            <p>In <strong>MainWindow.xaml</strong>, center a <code class="inline">TextBlock</code> reading
            <em>Hello, WinUI 3!</em> at 28px inside the root <code class="inline">StackPanel</code>.</p>
            <div class="bonus"><span class="note-title">Bonus</span>
            Pull the greeting text out of a hard-coded attribute and set it from code-behind in the
            <code class="inline">MainWindow</code> constructor instead. You'll rely on named elements next room.</div>
          `,
          checkpoint: { q: "Text on screen — keep pushing?", hint: "" }
        }
      }
    },

    /* ---------------------------------------------------------------- 3 */
    {
      id: "controls",
      title: "Room III — Gather Your Tools",
      concept: "Add a TextBox and Button",
      variants: {
        gentle: {
          html: `
            <p>Static text is fine, but apps <em>interact</em>. Let's add a box to type in and a button to press.
            We give each one an <code class="inline">x:Name</code> so our code can find it later &mdash; like
            labelling your tools.</p>
            <pre>&lt;TextBox x:Name="NameInput" PlaceholderText="Enter your name" Width="240" /&gt;
&lt;Button x:Name="GreetButton" Content="Greet" /&gt;
&lt;TextBlock x:Name="Greeting" FontSize="20" /&gt;</pre>
            <p>Put those three inside the same StackPanel (you can keep or remove the first greeting).
            Run it: a text box and a button appear. The button doesn't do anything <em>yet</em> &mdash; that's the next room.</p>
            <div class="note"><span class="note-title">x:Name matters</span>
            Only named elements can be reached from C#. <code class="inline">NameInput</code>,
            <code class="inline">GreetButton</code>, and <code class="inline">Greeting</code> are the handles we'll use.</div>
          `,
          checkpoint: { q: "Text box + button showing up?", hint: "" }
        },
        standard: {
          html: `
            <p>Add input controls to the StackPanel, each with an <code class="inline">x:Name</code> for code access:</p>
            <pre>&lt;TextBox x:Name="NameInput" PlaceholderText="Enter your name" Width="240" /&gt;
&lt;Button x:Name="GreetButton" Content="Greet" /&gt;
&lt;TextBlock x:Name="Greeting" FontSize="20" /&gt;</pre>
            <p>Run it. Controls render; the button is inert until we wire an event next.</p>
          `,
          checkpoint: { q: "Controls laid out correctly?", hint: "" }
        },
        challenge: {
          html: `
            <p>Add a named <code class="inline">TextBox</code> (<code class="inline">NameInput</code>),
            <code class="inline">Button</code> (<code class="inline">GreetButton</code>), and result
            <code class="inline">TextBlock</code> (<code class="inline">Greeting</code>) to the panel.</p>
            <div class="bonus"><span class="note-title">Bonus</span>
            Constrain the layout: cap the panel width and keep it centered as the window resizes.
            (Foreshadowing the responsive rules from good LOB design.)</div>
          `,
          checkpoint: { q: "Controls in — onward?", hint: "" }
        }
      }
    },

    /* ---------------------------------------------------------------- 4 */
    {
      id: "events",
      title: "Room IV — Awaken the Button",
      concept: "Handle Click in code-behind",
      variants: {
        gentle: {
          html: `
            <p>Now the magic: make the button <em>respond</em>. When a button is clicked it raises a
            <strong>Click event</strong> &mdash; a little "it happened!" signal. We write a method to catch it.</p>
            <p>First, tell the button which method to call. Add <code class="inline">Click="GreetButton_Click"</code>:</p>
            <pre>&lt;Button x:Name="GreetButton" Content="Greet" Click="GreetButton_Click" /&gt;</pre>
            <p>Then open <strong>MainWindow.xaml.cs</strong> (the C# "code-behind") and add the method inside the class:</p>
            <pre>private void GreetButton_Click(object sender, RoutedEventArgs e)
{
    Greeting.Text = $"Hello, {NameInput.Text}!";
}</pre>
            <p>Run it, type your name, click <em>Greet</em>. Your greeting appears. You built a working feature!</p>
            <div class="note"><span class="note-title">Reading the code</span>
            <code class="inline">$"...{NameInput.Text}..."</code> drops whatever's in the box into the sentence.
            We set <code class="inline">Greeting.Text</code> &mdash; the TextBlock we named earlier.</div>
          `,
          checkpoint: { q: "Clicking Greet shows your name?", hint: "This room is the big leap — take your time." }
        },
        standard: {
          html: `
            <p>Wire the button's <code class="inline">Click</code> to a handler:</p>
            <pre>&lt;Button x:Name="GreetButton" Content="Greet" Click="GreetButton_Click" /&gt;</pre>
            <p>Implement it in <strong>MainWindow.xaml.cs</strong>:</p>
            <pre>private void GreetButton_Click(object sender, RoutedEventArgs e)
{
    Greeting.Text = $"Hello, {NameInput.Text}!";
}</pre>
            <p>Run, type, click &mdash; the greeting updates from the input.</p>
          `,
          checkpoint: { q: "Event handler firing correctly?", hint: "" }
        },
        challenge: {
          html: `
            <p>Wire <code class="inline">GreetButton.Click</code> to a code-behind handler that sets
            <code class="inline">Greeting.Text</code> from <code class="inline">NameInput.Text</code>.</p>
            <div class="bonus"><span class="note-title">Bonus</span>
            Guard the empty case (blank input → a friendly prompt, not "Hello, !"). Then notice how much this
            code-behind couples UI to logic &mdash; the next room fixes exactly that.</div>
          `,
          checkpoint: { q: "Handler done — ready for the boss room?", hint: "" }
        }
      }
    },

    /* ---------------------------------------------------------------- 5 */
    {
      id: "binding",
      title: "Room V — The Binding Rite (Boss)",
      concept: "x:Bind to a view model",
      variants: {
        gentle: {
          html: `
            <p>Setting <code class="inline">Greeting.Text</code> by hand works, but pros let the UI
            <em>bind</em> to data, so it updates itself. Think of a binding as a magic thread: change the data,
            the screen follows.</p>
            <p>We need a small data object that can announce changes. Add this class (a new file
            <code class="inline">MainViewModel.cs</code>):</p>
            <pre>using System.ComponentModel;

public sealed class MainViewModel : INotifyPropertyChanged
{
    private string _greeting = "Hello, WinUI 3!";
    public string Greeting
    {
        get =&gt; _greeting;
        set
        {
            _greeting = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Greeting)));
        }
    }
    public event PropertyChangedEventHandler PropertyChanged;
}</pre>
            <p>Expose it from the window (in <code class="inline">MainWindow.xaml.cs</code>):</p>
            <pre>public MainViewModel ViewModel { get; } = new();</pre>
            <p>Now bind the TextBlock to it in XAML:</p>
            <pre>&lt;TextBlock Text="{x:Bind ViewModel.Greeting, Mode=OneWay}" FontSize="20" /&gt;</pre>
            <p>Point your Click handler at the data instead of the control:</p>
            <pre>ViewModel.Greeting = $"Hello, {NameInput.Text}!";</pre>
            <p>Run it. Same result &mdash; but now the UI is watching the data. <strong>Boss down!</strong> One treasure room remains.</p>
            <div class="note"><span class="note-title">What just happened</span>
            <code class="inline">INotifyPropertyChanged</code> is the "announce a change" contract.
            <code class="inline">Mode=OneWay</code> means data → screen. Change the property anywhere and the label follows.</div>
          `,
          checkpoint: { q: "Bound greeting updating on click?", hint: "This is the hardest concept — a win here is a real milestone." }
        },
        standard: {
          html: `
            <p>Replace manual UI updates with a <strong>view model</strong> and <code class="inline">x:Bind</code>.</p>
            <p>Create <code class="inline">MainViewModel.cs</code>:</p>
            <pre>using System.ComponentModel;

public sealed class MainViewModel : INotifyPropertyChanged
{
    private string _greeting = "Hello, WinUI 3!";
    public string Greeting
    {
        get =&gt; _greeting;
        set { _greeting = value; PropertyChanged?.Invoke(this, new(nameof(Greeting))); }
    }
    public event PropertyChangedEventHandler PropertyChanged;
}</pre>
            <p>Expose and bind:</p>
            <pre>// MainWindow.xaml.cs
public MainViewModel ViewModel { get; } = new();

// MainWindow.xaml
&lt;TextBlock Text="{x:Bind ViewModel.Greeting, Mode=OneWay}" FontSize="20" /&gt;

// Click handler
ViewModel.Greeting = $"Hello, {NameInput.Text}!";</pre>
            <p>Run &mdash; the label now tracks the data. That's the MVVM seed. <strong>Boss down</strong> &mdash; claim your reward next room.</p>
          `,
          checkpoint: { q: "One-way binding working?", hint: "" }
        },
        challenge: {
          html: `
            <p>Refactor to MVVM: a <code class="inline">MainViewModel : INotifyPropertyChanged</code> exposing a
            <code class="inline">Greeting</code> property, bound via <code class="inline">{x:Bind ViewModel.Greeting, Mode=OneWay}</code>,
            with the Click handler mutating the view model rather than the control.</p>
            <div class="bonus"><span class="note-title">Boss bonus</span>
            Go further: replace the Click handler with an <code class="inline">ICommand</code> bound to the button
            (<code class="inline">Command="{x:Bind ViewModel.GreetCommand}"</code>) and two-way bind
            <code class="inline">NameInput</code> to a view-model property. Now the code-behind is empty &mdash;
            pure MVVM.</div>
            <p><strong>Boss down.</strong> A treasure room awaits.</p>
          `,
          checkpoint: { q: "MVVM refactor landed?", hint: "" }
        }
      }
    },

    /* ---------------------------------------------------------------- 6 */
    {
      id: "style",
      title: "Room VI — The Treasure Vault (Style &amp; Theme)",
      concept: "Style resources and theme brushes",
      variants: {
        gentle: {
          html: `
            <p>Your app <em>works</em> &mdash; now make it look the part. Rather than scattering
            <code class="inline">FontSize</code> and colours across every control, we define a reusable
            <strong>Style</strong> once and point controls at it. Think of it as a spell you cast many times.</p>
            <p>Add a resource inside your panel:</p>
            <pre>&lt;StackPanel.Resources&gt;
    &lt;Style x:Key="GreetingText" TargetType="TextBlock"&gt;
        &lt;Setter Property="FontSize" Value="24" /&gt;
        &lt;Setter Property="Foreground" Value="{ThemeResource AccentTextFillColorPrimaryBrush}" /&gt;
    &lt;/Style&gt;
&lt;/StackPanel.Resources&gt;</pre>
            <p>Then apply it to the greeting:</p>
            <pre>&lt;TextBlock Text="{x:Bind ViewModel.Greeting, Mode=OneWay}"
           Style="{StaticResource GreetingText}" /&gt;</pre>
            <p>Run it. The greeting picks up your system <em>accent</em> colour &mdash; and if you switch Windows
            between light and dark, it stays readable automatically.</p>
            <div class="note"><span class="note-title">Why ThemeResource?</span>
            <code class="inline">{ThemeResource ...}</code> pulls a colour from Windows' current theme, so light/dark
            "just works" &mdash; the same system-theme rule good LOB apps follow.</div>
          `,
          checkpoint: { q: "Greeting restyled with the accent colour?", hint: "Last room — a victory lap." }
        },
        standard: {
          html: `
            <p>Factor styling into a reusable <strong>Style</strong> resource and lean on
            <strong>theme brushes</strong> instead of hard-coded colours.</p>
            <pre>&lt;StackPanel.Resources&gt;
    &lt;Style x:Key="GreetingText" TargetType="TextBlock"&gt;
        &lt;Setter Property="FontSize" Value="24" /&gt;
        &lt;Setter Property="Foreground" Value="{ThemeResource AccentTextFillColorPrimaryBrush}" /&gt;
    &lt;/Style&gt;
&lt;/StackPanel.Resources&gt;

&lt;TextBlock Text="{x:Bind ViewModel.Greeting, Mode=OneWay}"
           Style="{StaticResource GreetingText}" /&gt;</pre>
            <p>Run, then toggle Windows light/dark &mdash; the accent-based text adapts without extra code.</p>
          `,
          checkpoint: { q: "Style resource applied and theme-aware?", hint: "" }
        },
        challenge: {
          html: `
            <p>Promote the greeting's look to a keyed <code class="inline">Style</code> using
            <code class="inline">{ThemeResource}</code> brushes, applied via
            <code class="inline">Style="{StaticResource ...}"</code>.</p>
            <div class="bonus"><span class="note-title">Treasure bonus</span>
            Move the <code class="inline">Style</code> up to <code class="inline">App.xaml</code>'s
            <code class="inline">Application.Resources</code> so every window shares it, then add a
            <code class="inline">ResourceDictionary.ThemeDictionaries</code> block to override a brush per theme.
            That's the seed of an app-wide design system.</div>
          `,
          checkpoint: { q: "App-wide, theme-aware styling in place?", hint: "" }
        }
      }
    }
  ],

  outro: {
    eyebrow: "Victory",
    title: "You cleared the dungeon",
    html: `
      <p class="lead">You built a real WinUI&nbsp;3 app: a window, controls, an event, data binding, and a
      themed coat of paint &mdash; the spine of every desktop app you'll write next.</p>
      <p>But here's the point of the demo: <strong>the book adapted to you.</strong> Two readers finishing this
      quest didn't read the same pages. Here's the path <em>you</em> took:</p>
    `
  }
};
