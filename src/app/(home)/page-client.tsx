import { buttonVariants } from "~/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-black">
      <div className="flex flex-1 flex-col bg-black text-white">
        <div className="relative z-10 container flex flex-grow flex-col items-center gap-8 px-4">
          <div className="text-center">
            <div className="flex flex-col items-center pt-24 md:pt-30">
              <div className="mb-6 flex justify-center">
                <Image
                  src="/app-icon.png"
                  alt="DeepFish AI"
                  width={128}
                  height={128}
                  sizes="128px"
                  quality={90}
                />
              </div>

              <h1
                className="glitch-text mb-4 font-mono text-4xl font-bold text-white md:text-6xl"
                id="deepfish-title"
              >
                DEEPFI::SH
              </h1>

              <div>
                <div className="mx-auto mb-4 h-0.5 w-40 bg-white"></div>
                <p className="mx-auto max-w-3xl font-mono text-xl tracking-wider text-gray-300">
                  [ BEST IN CLASS AI WORKFLOW COMPOSER ]
                </p>
              </div>

              <div className="flex flex-col items-center gap-2 pt-4">
                <Link
                  href="/join"
                  prefetch
                  className={buttonVariants({
                    variant: "rainbow",
                    className: "w-full",
                  })}
                >
                  TRY FOR FREE
                </Link>
                <div className="flex w-full justify-center gap-4">
                  <Link
                    href={process.env.NEXT_PUBLIC_X_PROFILE_URL || ""}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants()}
                    aria-label="Follow DeepFish on X"
                  >
                    <svg
                      width="1200"
                      height="1227"
                      viewBox="0 0 1200 1227"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 79.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1150.3H892.476L569.165 687.854V687.828Z"
                        fill="white"
                      />
                    </svg>
                    <span>Follow the Journey</span>
                  </Link>
                </div>
                <div className="flex w-full justify-center gap-4">
                  <Link
                    href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || "/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants()}
                    aria-label="Follow DeepFish on X"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                    </svg>
                    <span>Join the Community</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative w-full max-w-5xl">
            <Image
              src="/preview.png"
              alt="DeepFish AI Platform Preview"
              width={1920}
              height={1080}
              className="h-auto w-full"
              priority
              fetchPriority="high"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1280px"
              quality={85}
            />
            <div className="absolute -top-[4.5rem] -left-12 sm:-top-[6.5rem] sm:-left-12 lg:-top-[7.8rem] lg:-left-4">
              <picture>
                <source srcSet="/deepfish.apng" type="image/apng" />
                <source srcSet="/deepfish.webp" type="image/webp" />
                <img
                  src="/deepfish-transparent.gif"
                  alt="DeepFish character waving"
                  className="h-28 w-auto sm:h-40 lg:h-48"
                />
              </picture>
            </div>
          </div>

          <div className="flex-grow"></div>

          <footer className="mt-20 mb-8 w-full text-center font-mono text-sm text-gray-400">
            <div className="mb-4 flex items-center justify-center">
              <div className="border-border-strong mr-2 flex h-6 w-6 items-center justify-center border">
                <span className="text-xs">&#169;</span>
              </div>
              <p>
                2025 DEEPFISH / ALL RIGHTS RESERVED / SYS::READY
                <span className="ml-2 inline-block h-4 w-2 bg-white"></span>
              </p>
            </div>

            <div className="flex items-center justify-center space-x-6">
              <Link
                href={process.env.NEXT_PUBLIC_X_PROFILE_URL || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                aria-label="Twitter/X"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-current"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </Link>
              <Link
                href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                aria-label="Twitter/X"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                >
                  <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
                </svg>
              </Link>
              <a
                href="https://github.com/noahgsolomon"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
                aria-label="GitHub"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="fill-current"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405 1.02 0 2.04.135 3 .405 2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
              </a>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}
